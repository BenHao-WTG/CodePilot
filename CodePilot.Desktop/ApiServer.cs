using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Threading.Tasks;

namespace CodePilot
{
    public class ApiServer : IApiServer
    {
        private Process? _serverProcess;
        private int _port;

        public int Port => _port;

        public async Task StartAsync()
        {
            // Get a free port
            _port = GetFreePort();

            // Determine the path to the API server
            var baseDir = AppDomain.CurrentDomain.BaseDirectory;
            var apiServerPath = Path.Combine(baseDir, "api", "CodePilot.Api.dll");

            if (!File.Exists(apiServerPath))
            {
                throw new FileNotFoundException($"API server not found at: {apiServerPath}");
            }

            // Start the API server process
            _serverProcess = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "dotnet",
                    Arguments = $"\"{apiServerPath}\" --urls=http://localhost:{_port}",
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    WorkingDirectory = Path.GetDirectoryName(apiServerPath)
                }
            };

            _serverProcess.OutputDataReceived += (sender, args) =>
            {
                if (!string.IsNullOrEmpty(args.Data))
                    Console.WriteLine($"[API] {args.Data}");
            };

            _serverProcess.ErrorDataReceived += (sender, args) =>
            {
                if (!string.IsNullOrEmpty(args.Data))
                    Console.Error.WriteLine($"[API Error] {args.Data}");
            };

            _serverProcess.Start();
            _serverProcess.BeginOutputReadLine();
            _serverProcess.BeginErrorReadLine();

            // Wait for the server to be ready
            await WaitForServerAsync();
        }

        public Task StopAsync()
        {
            if (_serverProcess != null && !_serverProcess.HasExited)
            {
                _serverProcess.Kill(true);
                _serverProcess.Dispose();
                _serverProcess = null;
            }

            return Task.CompletedTask;
        }

        private static int GetFreePort()
        {
            using var listener = new TcpListener(IPAddress.Loopback, 0);
            listener.Start();
            var port = ((IPEndPoint)listener.LocalEndpoint).Port;
            listener.Stop();
            return port;
        }

        private async Task WaitForServerAsync()
        {
            var maxAttempts = 30;
            var delayMs = 200;

            for (int i = 0; i < maxAttempts; i++)
            {
                try
                {
                    using var client = new System.Net.Http.HttpClient();
                    var response = await client.GetAsync($"http://localhost:{_port}/api/health");
                    if (response.IsSuccessStatusCode)
                        return;
                }
                catch
                {
                    // Ignore and retry
                }

                await Task.Delay(delayMs);
            }

            throw new TimeoutException("API server failed to start within the timeout period");
        }
    }
}

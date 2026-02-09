using System.Threading.Tasks;

namespace CodePilot
{
    public interface IApiServer
    {
        int Port { get; }
        Task StartAsync();
        Task StopAsync();
    }
}

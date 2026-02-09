using System.Reflection;
var asm = Assembly.LoadFrom(args[0]);
Type[] types;
try { types = asm.GetTypes(); } catch (ReflectionTypeLoadException ex) { types = ex.Types.Where(t => t != null).ToArray()!; }
var t = Array.Find(types, x => x.Name == "CopilotSession");
foreach (var m in t.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)) {
  try { Console.WriteLine("  M: " + m.Name + "(" + string.Join(", ", m.GetParameters().Select(p2 => p2.ParameterType + " " + p2.Name)) + ") -> " + m.ReturnType.Name); } catch { Console.WriteLine("  M: " + m.Name); }
}

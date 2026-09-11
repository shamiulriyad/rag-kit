namespace Backend.Helpers;

/// <summary>Loads a `.env` file (if present) into process environment variables before
/// configuration is built - the same convenience rag/config.py gets from python-dotenv.
/// Real environment variables (Docker, CI, the shell) always win: this only fills in
/// values that are not already set. No dependency, ~20 lines, only used at startup.</summary>
public static class EnvFile
{
    public static void Load(string path)
    {
        if (!File.Exists(path)) return;

        foreach (var rawLine in File.ReadAllLines(path))
        {
            var line = rawLine.Trim();
            if (line.Length == 0 || line.StartsWith('#')) continue;

            var separator = line.IndexOf('=');
            if (separator <= 0) continue;

            var key = line[..separator].Trim();
            var value = line[(separator + 1)..].Trim();
            if (value.Length >= 2 && value[0] == '"' && value[^1] == '"')
                value = value[1..^1];

            if (Environment.GetEnvironmentVariable(key) is null)
                Environment.SetEnvironmentVariable(key, value);
        }
    }
}

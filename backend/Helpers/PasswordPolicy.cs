namespace Backend.Helpers;

/// <summary>Rejects the passwords attackers try first. Length is already enforced by the DTOs; this
/// adds a short deny-list of the most common choices, "password" in different spellings, repeated or
/// sequential characters and an email address used as its own password.</summary>
public static class PasswordPolicy
{
    private static readonly HashSet<string> Common = new(StringComparer.OrdinalIgnoreCase)
    {
        "password", "password1", "password12", "password123", "password1234", "passw0rd", "p@ssw0rd", "p@ssword",
        "12345678", "123456789", "1234567890", "12345678910", "11111111", "00000000", "87654321", "12341234",
        "qwerty123", "qwertyui", "qwertyuiop", "qwerty1234", "1q2w3e4r", "1q2w3e4r5t", "1qaz2wsx", "zaq12wsx",
        "iloveyou", "iloveyou1", "admin123", "adminadmin", "administrator", "welcome1", "welcome123", "letmein123",
        "changeme", "changeme123", "abcd1234", "abc12345", "abcdefgh", "asdfghjkl", "zxcvbnm1", "football1",
        "baseball1", "superman1", "monkey123", "dragon123", "master123", "trustno1", "sunshine1", "princess1",
        "starwars1", "whatever1", "freedom1", "shadow123", "michael123", "jennifer1", "computer1", "internet1",
    };

    /// <summary>Throws <see cref="ValidationAppException"/> with a message safe to show to the user.</summary>
    public static void Validate(string password, string? email = null)
    {
        if (Common.Contains(password.Trim()))
            throw new ValidationAppException("That password is too common. Choose something harder to guess.");

        if (password.Distinct().Count() <= 2)
            throw new ValidationAppException("That password is too repetitive. Mix in more different characters.");

        if (IsSequential(password))
            throw new ValidationAppException("That password is a simple sequence. Choose something harder to guess.");

        if (email is not null)
        {
            var local = email.Split('@')[0];
            if (password.Equals(email, StringComparison.OrdinalIgnoreCase)
                || (local.Length >= 4 && password.Equals(local, StringComparison.OrdinalIgnoreCase)))
                throw new ValidationAppException("Your password can't be your email address.");
        }
    }

    /// <summary>True for runs like 12345678 or abcdefgh (every step +1 or every step -1).</summary>
    private static bool IsSequential(string s)
    {
        if (s.Length < 6) return false;
        var up = true;
        var down = true;
        for (var i = 1; i < s.Length; i++)
        {
            up &= s[i] == s[i - 1] + 1;
            down &= s[i] == s[i - 1] - 1;
        }
        return up || down;
    }
}

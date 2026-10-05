using System.Net;
using System.Net.Mail;

namespace Backend.Integrations.Email;

/// <summary>Bound from the "Email" section (env <c>Email__Smtp__Host</c> etc.). Email is optional:
/// without an SMTP host the app still runs, but password-reset and verification links cannot be
/// delivered (see <see cref="LogEmailSender"/>).</summary>
public class EmailOptions
{
    /// <summary>Public URL of the React app, used to build the links in emails.</summary>
    public string AppBaseUrl { get; set; } = "http://localhost:5173";

    public SmtpOptions Smtp { get; set; } = new();
}

public class SmtpOptions
{
    public string? Host { get; set; }
    public int Port { get; set; } = 587;
    public bool EnableSsl { get; set; } = true;
    public string? Username { get; set; }
    public string? Password { get; set; }
    public string From { get; set; } = "RAG Starter <no-reply@localhost>";
}

public interface IEmailSender
{
    /// <summary>True when messages are really delivered (an SMTP host is configured).</summary>
    bool IsConfigured { get; }

    Task SendAsync(string to, string subject, string textBody, CancellationToken ct = default);
}

/// <summary>Delivers over SMTP. Failures are logged and swallowed by callers that must not leak
/// whether an address exists (forgot-password), so this throws and lets them decide.</summary>
public class SmtpEmailSender : IEmailSender
{
    private readonly SmtpOptions _smtp;
    private readonly ILogger<SmtpEmailSender> _log;

    public SmtpEmailSender(Microsoft.Extensions.Options.IOptions<EmailOptions> options, ILogger<SmtpEmailSender> log)
    {
        _smtp = options.Value.Smtp;
        _log = log;
    }

    public bool IsConfigured => true;

    public async Task SendAsync(string to, string subject, string textBody, CancellationToken ct = default)
    {
        using var client = new SmtpClient(_smtp.Host, _smtp.Port) { EnableSsl = _smtp.EnableSsl };
        if (!string.IsNullOrWhiteSpace(_smtp.Username))
            client.Credentials = new NetworkCredential(_smtp.Username, _smtp.Password);

        using var message = new MailMessage { From = new MailAddress(_smtp.From), Subject = subject, Body = textBody };
        message.To.Add(to);
        await client.SendMailAsync(message, ct);
        _log.LogInformation("Email '{Subject}' sent to {To}", subject, to);
    }
}

/// <summary>Used when no SMTP host is configured. Nothing is delivered. In Development the full
/// message (including the link) is written to the log so the flow can be tried locally; elsewhere
/// the body is NOT logged, because a reset link in a log file is a credential.</summary>
public class LogEmailSender : IEmailSender
{
    private readonly ILogger<LogEmailSender> _log;
    private readonly IWebHostEnvironment _env;

    public LogEmailSender(ILogger<LogEmailSender> log, IWebHostEnvironment env)
    {
        _log = log;
        _env = env;
    }

    public bool IsConfigured => false;

    public Task SendAsync(string to, string subject, string textBody, CancellationToken ct = default)
    {
        if (_env.IsDevelopment())
            _log.LogWarning("EMAIL NOT SENT (no SMTP configured) to {To} - {Subject}\n{Body}", to, subject, textBody);
        else
            _log.LogWarning("Email '{Subject}' to {To} was not sent: set Email__Smtp__Host to enable email delivery.", subject, to);
        return Task.CompletedTask;
    }
}

export default function welcomeTemplate(name: string, url: string) {
    return `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f4f4f7;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .header {
          background: #4f46e5;
          color: #ffffff;
          padding: 20px;
          text-align: center;
          font-size: 20px;
          font-weight: bold;
        }
        .content {
          padding: 30px;
          color: #333;
          line-height: 1.6;
        }
        .button {
          display: inline-block;
          margin-top: 20px;
          padding: 12px 20px;
          background: #4f46e5;
          color: #fff;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
        }
        .footer {
          text-align: center;
          font-size: 12px;
          color: #888;
          padding: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          Welcome to OpenChat 🚀
        </div>

        <div class="content">
          <p>Hi ${name || "there"},</p>

          <p>
            Welcome to <strong>OpenChat</strong> — your open-source space for seamless communication.
          </p>

          <p>
            We're excited to have you onboard! You can start chatting, creating rooms, and collaborating with others right away.
          </p>

          <a href="${url}" class="button">
            Get Started
          </a>

          <p style="margin-top: 30px;">
            If you have any questions or want to contribute, feel free to explore our community.
          </p>

          <p>
            — The OpenChat Team
          </p>
        </div>

        <div class="footer">
          You’re receiving this email because you signed up for OpenChat.
        </div>
      </div>
    </body>
  </html>
  `;
}
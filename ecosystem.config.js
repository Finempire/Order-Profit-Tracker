module.exports = {
  apps: [
    {
      name: "manufacturing-app",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/var/www/manufacturing-app",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      max_memory_restart: "1G",
      error_file: "/var/log/pm2/mfg-error.log",
      out_file: "/var/log/pm2/mfg-out.log",
    },
  ],
};

module.exports = {
  apps: [
    {
      name: "manufacturing-app",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/var/www/order-profit-tracker",

      // Single instance — scale up with exec_mode:"cluster" + instances:"max" when needed
      instances: 1,
      exec_mode: "fork",

      // Auto-restart policy
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 3000,

      // Restart if memory exceeds 1 GB
      max_memory_restart: "1G",

      // Logs
      error_file: "/var/log/pm2/mfg-error.log",
      out_file: "/var/log/pm2/mfg-out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",

      // Graceful shutdown — let Next.js finish in-flight requests
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,

      // Default env (override with --env production)
      env: {
        NODE_ENV: "development",
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};

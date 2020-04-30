module.exports = {
  apps : [{
    name: "AtomiX Network",
    script: "./index.js",
    instances: "max",
    env: {
      NODE_ENV: "development",
    },
    env_production: {
      NODE_ENV: "production",
    }
  }]
}

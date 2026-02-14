const start = require("./game/backend/main.js");

const run = async () => {
    start();
}
run();

const errors = async () => {
    const chalk = (await import("chalk")).default;
    process.on("unhandledRejection", (err) => console.error(chalk.hex("#ff0000")("Unhandled rejection: ", err)));
    process.on("rejectionHandled", (err) => console.error(chalk.hex("#ff0000")("Rejection handled: ", err)));
    process.on("uncaughtException", (err) => console.error(chalk.hex("#ff0000")("Uncaught exception: ", err)));
}
errors();
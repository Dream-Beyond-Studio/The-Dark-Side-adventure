"use strict";
const path = require("path");
const express = require("express");
const http = require("http");
const app = express();
app.use(require("cookie-parser")());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(require("helmet")({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    dnsPrefetchControl: false,
    expectCt: false,
    frameguard: false,
    hidePoweredBy: false,
    hsts: false,
    ieNoOpen: false,
    noSniff: false,
    originAgentCluster: false,
    permittedCrossDomainPolicies: false,
    referrerPolicy: false,
    xssFilter: false
}));
app.use(require("compression")());
const server = http.createServer(app);

module.exports = (conn, r) => {
    app.engine(".html", require("ejs").__express);
    app.set("views", path.join(__dirname, "../frontend"));
    app.set("view engine", "html");

    app.get("/", (req, res) => {
        res.render("html/main.html", {});
    });

    app.get("/docs", (req, res) => {
        res.render("html/docs.html", {});
    });

    app.use("/css", express.static(path.join(__dirname, "../frontend/css")));
    app.use("/js", express.static(path.join(__dirname, "../frontend/js")));
    app.use("/assets", express.static(path.join(__dirname, "../assets")));

    const listener = server.listen(process.env.PORT || 8080, () => {
        console.log("Panel uruchomiony na porcie " + listener.address().port);
    });
}
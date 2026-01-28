// swagger.js
const swaggerAutogen = require('swagger-autogen')({openapi: '3.0.0'});

const doc = {
  info: {
    title: "E-Commerce Automatic API",
    description:
      "This is an automatic generated swagger documentation for E-Commerce API Powered by Barakah IT",
  },
  host: "localhost:3000",
  schemes: ["http"],
  securityDefinitions: {
    Bearer: {
      type: "apiKey",
      in: "header", // can be "header", "query" or "cookie"
      name: "Authorization", // name of the header, query parameter or cookie
      description: "Please enter a valid token to test the requests below...",
    },
  },
  security: [{ Bearer: [] }],
};

const outputFile = "./swagger-output.json"; // Ei file ta automatic create hobe
const routes = ["./server.js"]; // Apnar main route file er path (index.js ba app.js)

/* NOTE: If you have separate route files like './routes/user.js', 
   add them to the routes array or just include the main entry point */

swaggerAutogen(outputFile, routes, doc).then(() => {
  require("./server.js"); // Your project's main file
});

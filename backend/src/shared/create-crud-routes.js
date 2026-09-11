const { Router } = require("express");
const { CrudRepository } = require("./crud.repository");
const { CrudService } = require("./crud.service");
const { CrudController } = require("./crud.controller");

function createCrudRoutes(options) {
  const routes = Router();
  const repository = new CrudRepository(options.modelName);
  const service = new CrudService(repository, options);
  const controller = new CrudController(service, options.resourceName);

  routes.get("/", controller.list);
  routes.get("/:id", controller.getById);
  routes.post("/", controller.create);
  routes.patch("/:id", controller.update);
  routes.delete("/:id", controller.remove);

  return routes;
}

module.exports = { createCrudRoutes };

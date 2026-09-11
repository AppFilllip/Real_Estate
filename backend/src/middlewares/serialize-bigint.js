function serializeBigInt(_req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = (body) =>
    originalJson(
      JSON.parse(
        JSON.stringify(body, (_key, value) =>
          typeof value === "bigint" ? value.toString() : value
        )
      )
    );

  next();
}

module.exports = { serializeBigInt };

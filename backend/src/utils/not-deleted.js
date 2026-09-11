const notDeleted = {
  OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
};

function withNotDeleted(where = {}) {
  return { AND: [where, notDeleted] };
}

module.exports = { notDeleted, withNotDeleted };

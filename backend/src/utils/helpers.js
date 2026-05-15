const isAdminUser = (user) => {
  return user && user.role === 'admin';
};

const hasObjectIdMatch = (id1, id2) => {
  if (!id1 || !id2) return false;
  return String(id1) === String(id2);
};

module.exports = {
  isAdminUser,
  hasObjectIdMatch,
};

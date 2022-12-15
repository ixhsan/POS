const isLoggedIn = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  res.redirect("/login");
};

const isAdmin = (req, res, next) => {
  if (req.session.user.role == 'admin') {
    return next();
  }
  res.redirect('back');
};

module.exports = {
  isLoggedIn,
  isAdmin
};

const routes = require('next-routes')();

routes
    .add('/transactionHistory', 'transactionHistory')
// export default routes; 
module.exports = routes;
const { version } = require('../../package.json');

module.exports = function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ version });
};

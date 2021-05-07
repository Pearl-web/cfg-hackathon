const { Pool } = require('pg');
const url = require('url');
// require('env2')('../config.env');
require('dotenv').config({path:'./.env'})

// if (!process.env.DB_URL)
//     throw new Error('Enviroment variable DB_URL must be set');

// const params = url.parse(process.env.DB_URL);
// const [username, password] = params.auth.split(':');

// const options = {
//     host: params.hostname,
//     port: params.port,
//     database: params.pathname.split('/')[1],
//     max: process.env.DB_MAX_CONNECTIONS || 2,
//     user: username,
//     password,
//     ssl: params.hostname !== 'localhost'
// };


const options = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    max: process.env.DB_MAX_CONNECTIONS || 2,
    user: process.env.DB_USER,
    password: process.env.DB_PASS

};


// const options = {
//     host: 'localhost',
//     port: 5432,
//     database: 'postgres',
//     max: process.env.DB_MAX_CONNECTIONS || 2,
//     user: 'huda',
//     password: 'super',
//     // ssl: params.hostname !== 'localhost'
// };

module.exports = new Pool(options);
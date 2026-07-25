import dotenv from 'dotenv';
dotenv.config();

export default {
  development: {
    client: 'sqlite3',
    connection: {
      filename: './mfmpl_dev.sqlite3'
    },
    useNullAsDefault: true,
    migrations: {
      directory: './migrations'
    },
    seeds: {
      directory: './seeds'
    }
  },
  production: {
    client: 'sqlite3',
    connection: {
      filename: './mfmpl_prod.sqlite3'
    },
    useNullAsDefault: true,
    migrations: {
      directory: './migrations'
    }
  }
};

export interface AppConfig {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  mongodbUri: string;
  jwt: {
    accessSecret: string;
    accessTtl: string;
    refreshTtl: string;
  };
  upload: {
    dir: string;
    staticBaseUrl: string;
  };
}

export default (): AppConfig => ({
  nodeEnv: (process.env.NODE_ENV as AppConfig['nodeEnv']) ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  mongodbUri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/momoya',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '2h',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '14d',
  },
  upload: {
    dir: process.env.UPLOAD_DIR ?? './uploads',
    staticBaseUrl: process.env.STATIC_BASE_URL ?? 'http://localhost:3000/static',
  },
});

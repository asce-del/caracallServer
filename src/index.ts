import "reflect-metadata";
import { MikroORM } from "@mikro-orm/core";
import { __prod__ } from "./consts";
import { __port__ } from "./consts";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import microConfig from "./mikro-orm.config";
import express from "express";
import redis from "redis";
import session from "express-session";
import connectRedis from "connect-redis";
import { MyContext } from "./types";

const main = async () => {
  const orm = await MikroORM.init(microConfig);
  await orm.getMigrator().up();

  const app = express();

  const RedisStore = connectRedis(session);
  const redisClient = redis.createClient();

  app.use(
    session({
      name: "qid",
      store: new RedisStore({
        client: redisClient,
        disableTouch: true,
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 YEARS
        httpOnly: true,
        sameSite: "lax", // csrf protection
        secure: __prod__, // cookie only works in https
      },
      saveUninitialized: false,
      secret: "dfjstretreqwrerewt",
      resave: false,
    })
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    context: ({ req, res }): MyContext => ({ em: orm.em, req, res }),
  });

  apolloServer.applyMiddleware({ app });

  app.listen(__port__, () => {
    console.log(`Server started on port ${__port__}`);
  });
};

main().catch((error) => console.error(error));

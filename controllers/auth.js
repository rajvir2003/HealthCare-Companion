import passport from "passport";
import { Strategy } from "passport-local";
import pg from "pg";
import bcrypt from "bcrypt";

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "healthAssist",
    password: "",
    port: 5432
  });
  db.connect();

passport.use(new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db.query(
        "SELECT * FROM users WHERE email = $1",
        [username]
      );
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        bcrypt.compare(password, storedHashedPassword, (error, result) => {
          if (error) {
            return cb(error);
          } else {
            if (result) {
              return cb(null, user);
            } else {
              console.log("wrong password");
              return cb(null, false);
            }
          }
        })
      } else {
        return cb("User not found");
      }
    } catch (error) {
      return cb(error);
    }
  }));
  
  passport.serializeUser((user, cb) => {
    cb(null, user);
  });
  passport.deserializeUser((user, cb) => {
    cb(null, user);
  })

  export default passport;
const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");

const app = express();

app.use(express.json());

const databasePath = path.join(__dirname, "userData.db");

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, console.log("Server running at http://localhost:3000/"));
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

//Register user API
app.post("/register/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(request.body.username, 10);
  const checkTheUsername = `
        SELECT
            *
        FROM
            user
        WHERE
            username = '${username}';`;
  const userData = await database.get(checkTheUsername);
  if (userData === undefined) {
    const createNewUserQuery = `
        INSERT INTO
            user(username, name, password, gender, location)
        VALUES
            ('${username}','${name}','${hashedPassword}','${gender}', '${location}');`;
    if (password.length < 5) {
      //password verification
      response.status(400);
      response.send("Password is too short");
    } else {
      const newUserDetails = await database.run(createNewUserQuery);
      response.status(200);
      response.send("User created successfully");
    }
  } else {
    //user exists
    response.status(400);
    response.send("User already exists");
  }
});

//login user API
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const checkTheUsername = `
        SELECT
            *
        FROM
            user
        WHERE
            username = '${username}';`;
  const userData = await database.get(checkTheUsername);
  if (userData === undefined) {
    // No user with username
    response.status(400);
    response.send("Invalid user");
  } else {
    // user exists
    const isPasswordMatch = await bcrypt.compare(password, userData.password);
    console.log(isPasswordMatch);
    if (isPasswordMatch === true) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

// password update

app.put("/change-password/", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const checkTheUsername = `
        SELECT
            *
        FROM
            user
        WHERE
            username = '${username}';`;
  const userData = await database.get(checkTheUsername);
  // verification of user
  if (userData === undefined) {
    response.status(400);
    response.send("User not registered");
  } else {
    // user exists then check for password
    const isValidPassword = await bcrypt.compare(
      oldPassword,
      userData.password
    );
    if (isValidPassword === true) {
      // check new password length
      if (newPassword.length < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        //password update
        const encryptedPassword = await bcrypt.hash(newPassword, 10);
        const updatePasswordQuery = `
        UPDATE
            user
        SET
            password = '${encryptedPassword}'
        WHERE 
            username = '${username}';`;
        await database.run(updatePasswordQuery);
        response.status(200);
        response.send("Password updated");
      }
    } else {
      // invalid old password
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;

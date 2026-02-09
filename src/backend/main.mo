import Array "mo:core/Array";
import Order "mo:core/Order";
import Map "mo:core/Map";
import Migration "migration";

(with migration = Migration.run)
actor {
  public type Score = {
    playerName : Text;
    score : Nat;
  };

  module Score {
    public func compare(score1 : Score, score2 : Score) : Order.Order {
      if (score1.score > score2.score) {
        #less;
      } else if (score1.score < score2.score) {
        #greater;
      } else {
        #equal;
      };
    };
  };

  // Use persistent maps for all games.
  type GameScores = Map.Map<Text, Nat>;

  let snakeScores = Map.empty<Text, Nat>();
  let tetrisScores = Map.empty<Text, Nat>();
  let pongScores = Map.empty<Text, Nat>();
  let pacManScores = Map.empty<Text, Nat>();
  let spaceInvadersScores = Map.empty<Text, Nat>();
  let breakoutScores = Map.empty<Text, Nat>();
  let asteroidsScores = Map.empty<Text, Nat>();
  let donkeyKongScores = Map.empty<Text, Nat>();
  let rollingBallsScores = Map.empty<Text, Nat>();
  let froggerScores = Map.empty<Text, Nat>();
  let galagaScores = Map.empty<Text, Nat>();
  let minesweeperScores = Map.empty<Text, Nat>();

  // Add missing persistent maps.
  let centipedeScores = Map.empty<Text, Nat>();
  let missileCommandScores = Map.empty<Text, Nat>();
  let pinballScores = Map.empty<Text, Nat>();
  let bubbleShooterScores = Map.empty<Text, Nat>();
  let qbertScores = Map.empty<Text, Nat>();
  let digDugScores = Map.empty<Text, Nat>();

  type Game = {
    name : Text;
    description : Text;
    thumbnail : Text;
  };

  let games : [Game] = [
    {
      name = "Snake";
      description = "Classic snake game. Eat food, grow longer, avoid walls and yourself.";
      thumbnail = "snake_thumbnail.png";
    },
    {
      name = "Tetris";
      description = "Block-stacking puzzle. Rotate and place shapes to clear lines.";
      thumbnail = "tetris_thumbnail.png";
    },
    {
      name = "Pong";
      description = "Retro paddle game. Keep the ball in play against computer.";
      thumbnail = "pong_thumbnail.png";
    },
    {
      name = "Pac-Man";
      description = "Navigate mazes, eat dots, avoid ghosts and power up with special dots.";
      thumbnail = "pacman_thumbnail.png";
    },
    {
      name = "Space Invaders";
      description = "Defend earth by shooting aliens in this space-themed action game.";
      thumbnail = "space_invaders_thumbnail.png";
    },
    {
      name = "Breakout";
      description = "Destroy bricks using paddles and balls in this classic arcade game.";
      thumbnail = "breakout_thumbnail.png";
    },
    {
      name = "Asteroids";
      description = "Navigate your spaceship and destroy asteroids in outer space.";
      thumbnail = "asteroids_thumbnail.png";
    },
    {
      name = "Donkey Kong";
      description = "Jump over obstacles and climb ladders in this platform adventure game.";
      thumbnail = "donkey_kong_thumbnail.png";
    },
    {
      name = "Rolling Balls";
      description = "Control a ball through obstacle courses, mastering rolling physics to reach checkpoints and score points over time.";
      thumbnail = "rolling_balls_thumbnail.png";
    },
    {
      name = "Frogger";
      description = "Classic action game. Dodge vehicles and hop across logs to safely reach the other side.";
      thumbnail = "assets/frogger.png";
    },
    {
      name = "Galaga";
      description = "Space shooter game where players must destroy waves of alien enemies.";
      thumbnail = "assets/galaga.png";
    },
    {
      name = "Minesweeper";
      description = "Puzzle game challenging players to clear a grid without triggering hidden mines.";
      thumbnail = "assets/minesweeper.png";
    },
    {
      name = "Centipede";
      description = "Shoot and eliminate segments of a centipede advancing through a field of mushrooms.";
      thumbnail = "assets/centipede.png";
    },
    {
      name = "Missile Command";
      description = "Defend your bases from incoming missiles by shooting them down before they hit.";
      thumbnail = "assets/missile_command.png";
    },
    {
      name = "Pinball";
      description = "Test your reflexes and score points by keeping a ball in play using flippers.";
      thumbnail = "assets/pinball.png";
    },
    {
      name = "Bubble Shooter";
      description = "Clear the board by shooting and matching bubbles of the same color.";
      thumbnail = "assets/bubble_shooter.png";
    },
    {
      name = "Q*bert";
      description = "Navigate a pyramid and change the color of cubes while avoiding obstacles.";
      thumbnail = "assets/qbert.png";
    },
    {
      name = "Dig Dug";
      description = "Dig tunnels, defeat enemies and earn points in this classic arcade game.";
      thumbnail = "assets/dig_dug.png";
    },
  ];

  public query ({ caller }) func getAvailableGames() : async [Game] {
    games;
  };

  public query ({ caller }) func getHighScores(game : Text) : async [Score] {
    let map = getGameScores(game);
    map.toArray().map(
      func((player, score)) {
        {
          playerName = player;
          score;
        };
      }
    ).sort();
  };

  public query ({ caller }) func getPlayerScore(game : Text, playerName : Text) : async ?Nat {
    getGameScores(game).get(playerName);
  };

  public shared ({ caller }) func submitScore(game : Text, playerName : Text, score : Nat) : async () {
    let map = getGameScores(game);
    switch (map.get(playerName)) {
      case (null) { map.add(playerName, score) };
      case (?existingScore) {
        if (score > existingScore) {
          map.add(playerName, score);
        };
      };
    };
  };

  func getGameScores(game : Text) : GameScores {
    switch (game) {
      case ("Snake") { snakeScores };
      case ("Tetris") { tetrisScores };
      case ("Pong") { pongScores };
      case ("Pac-Man") { pacManScores };
      case ("Space Invaders") { spaceInvadersScores };
      case ("Breakout") { breakoutScores };
      case ("Asteroids") { asteroidsScores };
      case ("Donkey Kong") { donkeyKongScores };
      case ("Rolling Balls") { rollingBallsScores };
      case ("Frogger") { froggerScores };
      case ("Galaga") { galagaScores };
      case ("Minesweeper") { minesweeperScores };
      case ("Centipede") { centipedeScores };
      case ("Missile Command") { missileCommandScores };
      case ("Pinball") { pinballScores };
      case ("Bubble Shooter") { bubbleShooterScores };
      case ("Q*bert") { qbertScores };
      case ("Dig Dug") { digDugScores };
      case (_) { Map.empty<Text, Nat>() };
    };
  };
};

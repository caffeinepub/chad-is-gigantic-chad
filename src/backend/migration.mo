import Map "mo:core/Map";
import Nat "mo:core/Nat";

module {
  // Old actor type.
  type OldActor = {
    snakeScores : Map.Map<Text, Nat>;
    tetrisScores : Map.Map<Text, Nat>;
    pongScores : Map.Map<Text, Nat>;
    pacManScores : Map.Map<Text, Nat>;
    spaceInvadersScores : Map.Map<Text, Nat>;
    breakoutScores : Map.Map<Text, Nat>;
    asteroidsScores : Map.Map<Text, Nat>;
    donkeyKongScores : Map.Map<Text, Nat>;
    rollingBallsScores : Map.Map<Text, Nat>;
  };

  // New actor type with extended high scores.
  type NewActor = {
    snakeScores : Map.Map<Text, Nat>;
    tetrisScores : Map.Map<Text, Nat>;
    pongScores : Map.Map<Text, Nat>;
    pacManScores : Map.Map<Text, Nat>;
    spaceInvadersScores : Map.Map<Text, Nat>;
    breakoutScores : Map.Map<Text, Nat>;
    asteroidsScores : Map.Map<Text, Nat>;
    donkeyKongScores : Map.Map<Text, Nat>;
    rollingBallsScores : Map.Map<Text, Nat>;
    froggerScores : Map.Map<Text, Nat>;
    galagaScores : Map.Map<Text, Nat>;
    minesweeperScores : Map.Map<Text, Nat>;
  };

  public func run(old : OldActor) : NewActor {
    {
      old with
      // Initialize new score maps for the extended games
      froggerScores = Map.empty<Text, Nat>();
      galagaScores = Map.empty<Text, Nat>();
      minesweeperScores = Map.empty<Text, Nat>();
    };
  };
};

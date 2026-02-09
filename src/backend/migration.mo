import Map "mo:core/Map";
import Nat "mo:core/Nat";

module {
  // Types for old and new actor states.
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
    froggerScores : Map.Map<Text, Nat>;
    galagaScores : Map.Map<Text, Nat>;
    minesweeperScores : Map.Map<Text, Nat>;
  };

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
    centipedeScores : Map.Map<Text, Nat>;
    missileCommandScores : Map.Map<Text, Nat>;
    pinballScores : Map.Map<Text, Nat>;
    bubbleShooterScores : Map.Map<Text, Nat>;
    qbertScores : Map.Map<Text, Nat>;
    digDugScores : Map.Map<Text, Nat>;
  };

  public func run(old : OldActor) : NewActor {
    {
      old with
      centipedeScores = Map.empty<Text, Nat>();
      missileCommandScores = Map.empty<Text, Nat>();
      pinballScores = Map.empty<Text, Nat>();
      bubbleShooterScores = Map.empty<Text, Nat>();
      qbertScores = Map.empty<Text, Nat>();
      digDugScores = Map.empty<Text, Nat>();
    };
  };
};

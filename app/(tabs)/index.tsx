import { useState } from "react";
import GameScreen from "../../components/ui/gamescreen";
import WelcomeScreen from "../../components/ui/welcomescreen";

export default function HomeScreen() {
  const [started, setStarted] = useState(false);

  const handleStartGame = () => {
    console.log("🎮 Starting game...");
    setStarted(true);
  };

  const handleBackToWelcome = () => {
    console.log("🏠 Returning to welcome screen...");
    setStarted(false);
  };

  return (
    <>
      {started ? (
        <GameScreen
          key={`game-${Date.now()}`}
          onBackToWelcome={handleBackToWelcome}
        />
      ) : (
        <WelcomeScreen onStart={handleStartGame} />
      )}
    </>
  );
}

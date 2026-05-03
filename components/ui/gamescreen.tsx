import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  ImageBackground,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { styles } from "./styles";

const { width, height } = Dimensions.get("window");

const popcornImages = [
  require("../../assets/images/popcorn.png"),
  require("../../assets/images/popcorn2.png"),
  require("../../assets/images/popcorn3.png"),
  require("../../assets/images/popcorn4.png"),
];

const getFinalMessage = (totalPops: number) => {
  if (totalPops >= 100) return " INSANE! You're a popping machine! ";
  if (totalPops >= 70) return " Great job! That's impressive! ";
  if (totalPops >= 40) return " Not bad! Keep practicing! ";
  if (totalPops >= 20) return " Meh... you can do better... ";
  return "🐌 Slow poke! Try again! 🐌";
};

type Item = {
  id: number;
  x: number;
  y: number;
  image: any;
};

interface GameScreenProps {
  onBackToWelcome?: () => void;
}

export default function GameScreen({ onBackToWelcome }: GameScreenProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState("");
  const [timeLeft, setTimeLeft] = useState(30);
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [gameActive, setGameActive] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isPaused, setIsPaused] = useState(false);
  const [showPausePopup, setShowPausePopup] = useState(false);
  // ✅ Start at -1 so the effect is inert on mount
  const [resumeCountdown, setResumeCountdown] = useState(-1);

  const messageTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const itemTimeouts = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const gridSize = 90;
  const topMargin = 180;
  const bottomMargin = 350;
  const leftMargin = 30;
  const rightMargin = 30;

  const getAvailableGridPositions = (existingItems: Item[]) => {
    const positions: { x: number; y: number }[] = [];
    for (let x = leftMargin; x < width - rightMargin; x += gridSize) {
      for (let y = topMargin; y < height - bottomMargin; y += gridSize) {
        const isFarEnough = existingItems.every((item) => {
          const distance = Math.sqrt(
            Math.pow(item.x - x, 2) + Math.pow(item.y - y, 2),
          );
          return distance >= gridSize;
        });
        if (isFarEnough) positions.push({ x, y });
      }
    }
    return positions;
  };

  // Initial 3-2-1 countdown
  useEffect(() => {
    if (countdown > 0) {
      const id = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
      return () => clearTimeout(id);
    }
    setGameActive(true);
  }, [countdown]);

  // ✅ Resume countdown tick — only runs when resumeCountdown > 0
  useEffect(() => {
    if (resumeCountdown <= 0) return;
    const id = setTimeout(() => setResumeCountdown((prev) => prev - 1), 1000);
    return () => clearTimeout(id);
  }, [resumeCountdown]);

  // ✅ Re-activate game once resume countdown finishes (hits exactly 0)
  useEffect(() => {
    if (resumeCountdown === 0) {
      setGameActive(true);
    }
  }, [resumeCountdown]);

  // 30s game timer — only ticks while gameActive and not paused
  useEffect(() => {
    if (gameActive && timeLeft > 0 && !isPaused) {
      timerInterval.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerInterval.current!);
            setGameActive(false);
            setShowResultPopup(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, [gameActive, isPaused]);

  // Handle pause/resume for existing items on screen
  useEffect(() => {
    if (isPaused) {
      itemTimeouts.current.forEach((id) => clearTimeout(id));
    } else if (gameActive && !isPaused && items.length > 0) {
      itemTimeouts.current.forEach((id) => clearTimeout(id));
      itemTimeouts.current.clear();
      items.forEach((item) => {
        const timeoutId = setTimeout(() => {
          setItems((prev) => prev.filter((i) => i.id !== item.id));
          itemTimeouts.current.delete(item.id);
        }, 2000);
        itemTimeouts.current.set(item.id, timeoutId);
      });
    }
    return () => {
      itemTimeouts.current.forEach((id) => clearTimeout(id));
    };
  }, [isPaused, gameActive]);

  // ✅ Spawn one popcorn at a time every 300ms
  // ✅ Faster + randomized spawning
  useEffect(() => {
    if (!gameActive || isPaused || countdown > 0) return;

    const spawnOne = () => {
      setItems((currentItems) => {
        const availablePositions = getAvailableGridPositions(currentItems);
        if (availablePositions.length === 0) return currentItems;

        const randomIndex = Math.floor(
          Math.random() * availablePositions.length,
        );
        const position = availablePositions[randomIndex];
        const randomImage =
          popcornImages[Math.floor(Math.random() * popcornImages.length)];

        const newItem: Item = {
          id: Date.now() + Math.random(), // avoid ID collision on double spawns
          x: position.x,
          y: position.y + 30,
          image: randomImage,
        };

        const timeoutId = setTimeout(() => {
          setItems((prev) => prev.filter((item) => item.id !== newItem.id));
          itemTimeouts.current.delete(newItem.id);
        }, 1800); // disappear a bit faster too → more pressure

        itemTimeouts.current.set(newItem.id, timeoutId);
        return [...currentItems, newItem];
      });
    };

    const interval = setInterval(() => {
      spawnOne();

      // 40% chance to spawn a second one shortly after → unpredictable bursts
      if (Math.random() < 0.4) {
        setTimeout(spawnOne, 80);
      }
    }, 150); // base rate: one every 150ms

    return () => clearInterval(interval);
  }, [gameActive, isPaused, countdown]);

  const handlePress = (item: Item) => {
    if (!gameActive || isPaused || countdown > 0) return;
    setScore((prev) => prev + 1);

    if (messageTimeout.current) clearTimeout(messageTimeout.current);
    messageTimeout.current = setTimeout(() => setMessage(""), 600);

    const timeoutId = itemTimeouts.current.get(item.id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      itemTimeouts.current.delete(item.id);
    }
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  };

  const handlePause = () => {
    if (gameActive && !isPaused) {
      setIsPaused(true);
      setShowPausePopup(true);
    }
  };

  const handleResume = () => {
    setShowPausePopup(false);
    setIsPaused(false);
    setGameActive(false);
    setResumeCountdown(3); // ✅ triggers the resume countdown
  };

  const resetGame = () => {
    setScore(0);
    setTimeLeft(30);
    setShowResultPopup(false);
    setShowPausePopup(false);
    setGameActive(false);
    setItems([]);
    setMessage("");
    setCountdown(3);
    setIsPaused(false);
    setResumeCountdown(-1); // ✅ reset to -1, not 0
    if (timerInterval.current) clearInterval(timerInterval.current);
    itemTimeouts.current.forEach((id) => clearTimeout(id));
    itemTimeouts.current.clear();
  };

  const handleHomePress = () => {
    if (timerInterval.current) clearInterval(timerInterval.current);
    itemTimeouts.current.forEach((id) => clearTimeout(id));
    itemTimeouts.current.clear();
    if (messageTimeout.current) clearTimeout(messageTimeout.current);
    onBackToWelcome?.();
  };

  return (
    <ImageBackground
      source={require("../../assets/images/bgd.png")}
      style={styles.container}
    >
      <View style={styles.scoreContainer}>
        <Image
          source={require("../../assets/images/jesus.png")}
          style={styles.scoreIcon}
        />
        <Text style={styles.scoreText}>{score}</Text>
      </View>

      <View style={styles.timerControlsContainer}>
        <TouchableOpacity style={styles.controlIcon} onPress={handlePause}>
          <Image
            source={require("../../assets/images/pause1.png")}
            style={styles.iconImage}
          />
        </TouchableOpacity>
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>⏱️ {timeLeft}s</Text>
        </View>
        <TouchableOpacity style={styles.controlIcon} onPress={resetGame}>
          <Image
            source={require("../../assets/images/retry1.png")}
            style={styles.iconImage}
          />
        </TouchableOpacity>
      </View>

      {countdown > 0 && resumeCountdown <= 0 && (
        <View style={styles.countdownContainer}>
          <Text style={styles.countdownText}>{countdown}</Text>
        </View>
      )}

      {resumeCountdown > 0 && (
        <View style={styles.countdownContainer}>
          <Text style={styles.countdownText}>{resumeCountdown}</Text>
        </View>
      )}

      {items.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[styles.item, { top: item.y, left: item.x }]}
          onPress={() => handlePress(item)}
        >
          <Image source={item.image} style={styles.popcorn} />
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.homeButton} onPress={handleHomePress}>
        <Image
          source={require("../../assets/images/home1.png")}
          style={styles.homeIcon}
        />
      </TouchableOpacity>

      <Modal
        transparent={true}
        visible={showPausePopup}
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitlePause}>What? tired already! 😏</Text>
            <Text style={styles.modalText}>Hurry up!!</Text>
            <TouchableOpacity style={styles.modalButton} onPress={handleResume}>
              <Text style={styles.modalButtonText}>Resume</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        transparent={true}
        visible={showResultPopup}
        animationType="fade"
        onRequestClose={() => setShowResultPopup(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Time's Up! ⏰</Text>
            <Text style={styles.resultScore}>
              You popped {score} popcorn{score !== 1 ? "s" : ""}!
            </Text>
            <Text style={styles.modalText}>{getFinalMessage(score)}</Text>
            <TouchableOpacity style={styles.modalButton} onPress={resetGame}>
              <Text style={styles.modalButtonText}>Play Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

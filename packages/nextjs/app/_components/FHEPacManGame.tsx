"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFhevm } from "@fhevm-sdk";
import { motion } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/helper/RainbowKitCustomConnectButton";
import { useFHEPacMan } from "~~/hooks/useFHEPacMan";

export const FHEPacManGame: React.FC = () => {
  const { isConnected, chain } = useAccount();
  const chainId = chain?.id;

  const provider = useMemo(() => (typeof window !== "undefined" ? (window as any).ethereum : undefined), []);

  const initialMockChains = {
    11155111: `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
  };

  const { submitScore, decryptScore, canDecrypt, isDecrypting, encryptedBest, results, statusMsg } = useFHEPacMan({
    instance: useFhevm({ provider, chainId, initialMockChains, enabled: true }).instance,
    initialMockChains,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [img, setImg] = useState<Record<string, HTMLImageElement> | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [message, setMessage] = useState("Welcome to FHE Pac-Man! Press Start to play.");
  const [latestScore, setLatestScore] = useState(0);

  const rowCount = 21;
  const columnCount = 19;
  const tileSize = 32;

  const pacmanRef = useRef<Block | null>(null);
  const ghostsRef = useRef<Set<Block>>(new Set());
  const wallsRef = useRef<Set<Block>>(new Set());
  const foodsRef = useRef<Set<Block>>(new Set());

  const gameStateRef = useRef<"idle" | "playing" | "over">("idle");
  const scoreRef = useRef(0);

  const directions = ["U", "D", "L", "R"];

  /** --- BLOCK CLASS --- */
  class Block {
    image: HTMLImageElement | null;
    x: number;
    y: number;
    width: number;
    height: number;
    startX: number;
    startY: number;
    direction: string;
    velocityX: number;
    velocityY: number;

    constructor(image: HTMLImageElement | null, x: number, y: number, w: number, h: number) {
      this.image = image;
      this.x = x;
      this.y = y;
      this.width = w;
      this.height = h;
      this.startX = x;
      this.startY = y;
      this.direction = "R";
      this.velocityX = 0;
      this.velocityY = 0;
    }

    updateDirection(dir: string) {
      const prev = this.direction;
      this.direction = dir;
      this.updateVelocity();
      this.x += this.velocityX;
      this.y += this.velocityY;

      for (const wall of wallsRef.current) {
        if (collision(this, wall)) {
          this.x -= this.velocityX;
          this.y -= this.velocityY;
          this.direction = prev;
          this.updateVelocity();
          return;
        }
      }
    }

    updateVelocity() {
      switch (this.direction) {
        case "U":
          this.velocityX = 0;
          this.velocityY = -tileSize / 8;
          break;
        case "D":
          this.velocityX = 0;
          this.velocityY = tileSize / 8;
          break;
        case "L":
          this.velocityX = -tileSize / 8;
          this.velocityY = 0;
          break;
        case "R":
          this.velocityX = tileSize / 8;
          this.velocityY = 0;
          break;
      }
    }

    reset() {
      this.x = this.startX;
      this.y = this.startY;
      this.velocityX = 0;
      this.velocityY = 0;
    }
  }

  /** --- COLLISION --- */
  function collision(a: Block, b: Block) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  /** --- LOAD IMAGES --- */
  useEffect(() => {
    const images: Record<string, HTMLImageElement> = {
      wall: new Image(),
      blue: new Image(),
      orange: new Image(),
      pink: new Image(),
      red: new Image(),
      pu: new Image(),
      pd: new Image(),
      pl: new Image(),
      pr: new Image(),
    };

    images.wall.src = "/wall.png";
    images.blue.src = "/blueGhost.png";
    images.orange.src = "/orangeGhost.png";
    images.pink.src = "/pinkGhost.png";
    images.red.src = "/redGhost.png";
    images.pu.src = "/pacmanUp.png";
    images.pd.src = "/pacmanDown.png";
    images.pl.src = "/pacmanLeft.png";
    images.pr.src = "/pacmanRight.png";

    const promises = Object.values(images).map(img => new Promise<void>(res => (img.onload = () => res())));
    Promise.all(promises).then(() => {
      setImg(images);
      setImgLoaded(true);
    });
  }, []);

  /** --- TILE MAP --- */
  const tileMap = [
    "XXXXXXXXXXXXXXXXXXX",
    "X        X        X",
    "X XX XXX X XXX XX X",
    "X                 X",
    "X XX X XXXXX X XX X",
    "X    X       X    X",
    "X    X            X",
    "XXX  X       X  XXX",
    "XXXX X XXrXX X XXXX",
    "X       bpo       X",
    "X    X     X X    X",
    "XXX  X       X  XXX",
    "XXX  X       X  XXX",
    "X        X        X",
    "X XX XX  X   XX XX X",
    "X  X     P     X  X",
    "XX X X       X X XX",
    "X    X   X   X    X",
    "X XXXXXX X XXXXXX X",
    "X                 X",
    "XXXXXXXXXXXXXXXXXXX",
  ];

  /** --- LOAD MAP --- */
  function loadMap() {
    if (!img) return;

    wallsRef.current.clear();
    foodsRef.current.clear();
    ghostsRef.current.clear();

    for (let r = 0; r < rowCount; r++) {
      for (let c = 0; c < columnCount; c++) {
        const char = tileMap[r][c];
        const x = c * tileSize;
        const y = r * tileSize;

        if (char === "X") wallsRef.current.add(new Block(img.wall, x, y, tileSize, tileSize));
        else if ("bopr".includes(char)) {
          const ghostImg = char === "b" ? img.blue : char === "o" ? img.orange : char === "p" ? img.pink : img.red;
          const ghost = new Block(ghostImg, x, y, tileSize, tileSize);
          ghost.updateDirection(directions[Math.floor(Math.random() * directions.length)]);
          ghostsRef.current.add(ghost);
        } else if (char === "P") pacmanRef.current = new Block(img.pr, x, y, tileSize, tileSize);
        else if (char === " ") foodsRef.current.add(new Block(null, x + 14, y + 14, 4, 4));
      }
    }
  }

  /** --- RESET POSITIONS --- */
  function resetPositions() {
    pacmanRef.current?.reset();
    for (const g of ghostsRef.current) {
      g.reset();
      g.updateDirection(directions[Math.floor(Math.random() * directions.length)]);
    }
  }

  /** --- MOVE ENTITIES --- */
  function moveEntities() {
    const pacman = pacmanRef.current;
    if (!pacman || gameStateRef.current !== "playing") return;

    // Pac-Man
    pacman.x += pacman.velocityX;
    pacman.y += pacman.velocityY;
    for (const wall of wallsRef.current) {
      if (collision(pacman, wall)) {
        pacman.x -= pacman.velocityX;
        pacman.y -= pacman.velocityY;
      }
    }

    // Ghosts
    for (const g of ghostsRef.current) {
      g.x += g.velocityX;
      g.y += g.velocityY;

      let collided = false;
      for (const wall of wallsRef.current) {
        if (collision(g, wall)) {
          g.x -= g.velocityX;
          g.y -= g.velocityY;
          collided = true;
          break;
        }
      }
      if (collided) g.updateDirection(directions[Math.floor(Math.random() * directions.length)]);

      if (collision(g, pacman)) {
        gameStateRef.current = "over";
        setLatestScore(scoreRef.current);
        setMessage("💀 Game Over! Press Start to play again.");
        pacman.velocityX = 0;
        pacman.velocityY = 0;
        for (const gg of ghostsRef.current) {
          gg.velocityX = 0;
          gg.velocityY = 0;
        }
      }
    }

    // Ăn food
    let eaten: Block | null = null;
    for (const f of foodsRef.current) {
      if (collision(pacman, f)) {
        eaten = f;
        scoreRef.current += 10;
        break;
      }
    }
    if (eaten) foodsRef.current.delete(eaten);

    if (foodsRef.current.size === 0) {
      loadMap();
      resetPositions();
      setMessage("🎉 You cleared the map! Keep going!");
    }
  }

  /** --- DRAW --- */
  function draw() {
    const board = canvasRef.current;
    const pacman = pacmanRef.current;
    if (!board || !pacman) return;
    const ctx = board.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, board.width, board.height);

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, board.width, board.height);

    for (const w of wallsRef.current) if (w.image) ctx.drawImage(w.image, w.x, w.y, w.width, w.height);
    if (pacman.image) ctx.drawImage(pacman.image, pacman.x, pacman.y, pacman.width, pacman.height);
    for (const g of ghostsRef.current) if (g.image) ctx.drawImage(g.image, g.x, g.y, g.width, g.height);

    ctx.fillStyle = "#00FFFF";
    for (const f of foodsRef.current) ctx.fillRect(f.x, f.y, f.width, f.height);

    ctx.fillStyle = "yellow";
    ctx.font = "16px sans-serif";
    ctx.fillText(`Score: ${scoreRef.current}`, 10, 20);

    if (gameStateRef.current === "over") {
      ctx.fillStyle = "#FF0000";
      ctx.font = "bold 32px sans-serif";
      ctx.fillText("GAME OVER", board.width / 2 - 90, board.height / 2 - 20);
    }
  }

  /** --- START GAME HANDLER --- */
  const startGameHandler = (isStart = false) => {
    scoreRef.current = 0;
    if (isStart) {
      gameStateRef.current = "playing";
      setMessage("🟡 Game Started! Eat all the dots and avoid ghosts!");
    }
    setLatestScore(0);

    wallsRef.current.clear();
    foodsRef.current.clear();
    ghostsRef.current.clear();
    loadMap();
    resetPositions();

    const board = canvasRef.current;
    if (!board) return;

    let animationId: number;
    function loop() {
      if (gameStateRef.current === "playing") {
        moveEntities();
        draw();
        animationId = requestAnimationFrame(loop);
      } else {
        cancelAnimationFrame(animationId);
        draw();
      }
    }

    loop();
  };

  /** --- GAME LOOP EFFECT --- */
  useEffect(() => {
    if (!imgLoaded) return;

    const board = canvasRef.current;
    if (!board) return;

    board.width = columnCount * tileSize;
    board.height = rowCount * tileSize;

    // tự động start game khi load trang
    startGameHandler(false);

    const handleKey = (e: KeyboardEvent) => {
      const pacman = pacmanRef.current;
      if (gameStateRef.current !== "playing" || !pacman || !img) return;

      if (e.code === "ArrowUp" || e.code === "KeyW") pacman.updateDirection("U");
      else if (e.code === "ArrowDown" || e.code === "KeyS") pacman.updateDirection("D");
      else if (e.code === "ArrowLeft" || e.code === "KeyA") pacman.updateDirection("L");
      else if (e.code === "ArrowRight" || e.code === "KeyD") pacman.updateDirection("R");

      if (pacman.direction === "U") pacman.image = img.pu;
      else if (pacman.direction === "D") pacman.image = img.pd;
      else if (pacman.direction === "L") pacman.image = img.pl;
      else if (pacman.direction === "R") pacman.image = img.pr;
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [imgLoaded]);

  useEffect(() => {
    if (!encryptedBest?.handle) return;
    const bestScore = results?.[encryptedBest.handle];
    if (bestScore !== undefined) {
      toast.success(`🏆 Best On-chain Score: ${Number(bestScore)}`);
    }
  }, [results, encryptedBest]);

  return (
    <>
      <Toaster position="bottom-center" />
      {/* Wallet Not Connected */}
      <div
        className={`h-[calc(100vh-100px)] max-w-3xl mx-auto p-6 flex items-center justify-center ${
          isConnected ? "hidden" : "flex"
        }`}
      >
        <div className="flex items-center justify-center w-full">
          <div
            className="bg-gradient-to-br from-gray-800 via-gray-900 to-black 
                shadow-2xl p-8 text-center rounded-3xl 
                border border-gray-700
                backdrop-blur-md
                text-white"
          >
            <div className="mb-6">
              <span className="inline-flex items-center justify-center w-20 h-20 animate-pulse">
                <img
                  src="pacmanRight.png"
                  alt="Pac-Man Icon"
                  width={80}
                  height={80}
                  className="rounded-full object-cover"
                />
              </span>
            </div>
            <h2 className="text-3xl font-extrabold text-white mb-3">Wallet Not Connected</h2>
            <p className="text-white mb-6">
              Connect your wallet to start playing <span className="font-bold text-yellow-500">FHE PAC-MAN</span>.
            </p>
            <div className="flex items-center justify-center">
              <RainbowKitCustomConnectButton />
            </div>
          </div>
        </div>
      </div>

      {/* Game */}
      <div className={`container mx-auto p-4 ${!isConnected ? "hidden" : "block"}`}>
        <h1
          className="text-center text-5xl font-extrabold mb-6 
          bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500
          bg-clip-text text-transparent
          drop-shadow-lg
          animate-pulse"
        >
          FHE PAC-MAN
        </h1>

        <div className="flex justify-center mb-4">
          <canvas ref={canvasRef}></canvas>
        </div>
        <p
          className="text-center text-lg mb-4
          text-black
          font-semibold
          drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]
          animate-pulse"
        >
          {message}
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <motion.button
            className="px-6 py-3 w-48 text-white rounded-2xl font-bold bg-cyan-500 hover:bg-cyan-600 active:scale-95"
            onClick={() => startGameHandler(true)}
            disabled={gameStateRef.current === "playing"} // Disable khi đang chơi
            whileTap={{ scale: gameStateRef.current === "playing" ? 1 : 0.95 }}
          >
            Start Game
          </motion.button>

          <motion.button
            className={`px-6 py-3 w-48 rounded-2xl font-bold shadow-md ${
              latestScore === 0 || gameStateRef.current === "playing"
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-purple-600 hover:bg-purple-700 active:scale-95"
            }`}
            disabled={latestScore === 0 || gameStateRef.current === "playing"} // Disable khi đang chơi
            whileTap={{ scale: latestScore === 0 || gameStateRef.current === "playing" ? 1 : 0.95 }}
            onClick={() => submitScore(latestScore)}
          >
            Upload Score
          </motion.button>

          <motion.button
            className={`px-6 py-3 w-48 rounded-2xl font-bold shadow-md ${
              !canDecrypt || gameStateRef.current === "playing"
                ? "bg-gray-500 text-gray-100 cursor-not-allowed"
                : "bg-green-600 text-white hover:bg-green-700 active:scale-95"
            }`}
            disabled={!canDecrypt || gameStateRef.current === "playing"} // Disable khi đang chơi
            whileTap={{ scale: !canDecrypt || gameStateRef.current === "playing" ? 1 : 0.95 }}
            onClick={decryptScore}
          >
            {isDecrypting ? "Decrypting..." : "Decypt Best Score"}
          </motion.button>

          {/* {encryptedBest?.handle && results?.[encryptedBest.handle] !== undefined && (
            <p className="text-center text-lg mt-4 font-semibold text-yellow-300">
              🏆 Best On-chain Score: <span className="text-white">{Number(results[encryptedBest.handle])}</span>
            </p>
          )} */}

          {statusMsg && <p className="text-center text-sm text-gray-300 mt-2">{statusMsg}</p>}
        </div>
      </div>
    </>
  );
};

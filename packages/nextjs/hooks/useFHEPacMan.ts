"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDeployedContractInfo } from "./helper";
import { useWagmiEthers } from "./wagmi/useWagmiEthers";
import { FhevmInstance } from "@fhevm-sdk";
import {
  buildParamsFromAbi,
  getEncryptionMethod,
  useFHEDecrypt,
  useFHEEncryption,
  useInMemoryStorage,
} from "@fhevm-sdk";
import { ethers } from "ethers";
import type { Contract } from "~~/utils/helper/contract";
import type { AllowedChainIds } from "~~/utils/helper/networks";

export const useFHEPacMan = (params: {
  instance: FhevmInstance | undefined;
  initialMockChains?: Readonly<Record<number, string>>;
}) => {
  const { instance, initialMockChains } = params;
  const { storage: decStore } = useInMemoryStorage();
  const { chainId, accounts, isConnected, ethersSigner, ethersReadonlyProvider } = useWagmiEthers(initialMockChains);

  const allowedChainId: AllowedChainIds | undefined =
    typeof chainId === "number" ? (chainId as AllowedChainIds) : undefined;

  const { data: pacmanContract } = useDeployedContractInfo({
    contractName: "FHEPacMan",
    chainId: allowedChainId,
  });

  type PacManContractInfo = Contract<"FHEPacMan"> & { chainId?: number };

  const [statusMsg, setStatusMsg] = useState("");
  const [processing, setProcessing] = useState(false);
  const [encryptedBest, setEncryptedBest] = useState<any>();

  const hasContract = Boolean(pacmanContract?.address && pacmanContract?.abi);

  const getContract = (mode: "read" | "write") => {
    if (!hasContract) return undefined;
    const provider = mode === "read" ? ethersReadonlyProvider : ethersSigner;
    if (!provider) return undefined;
    return new ethers.Contract(pacmanContract!.address, (pacmanContract as PacManContractInfo).abi, provider);
  };

  // ─────────────────────────────────────────────
  // Fetch Pac-Man encrypted top score
  // ─────────────────────────────────────────────
  const fetchTopScore = useCallback(async () => {
    if (!hasContract || !accounts?.[0]) return;

    try {
      const read = getContract("read");
      if (!read) return;

      const encrypted = await read.viewTopScore(accounts[0]);
      setEncryptedBest({
        handle: encrypted,
        contractAddress: pacmanContract!.address,
      });
    } catch (e) {
      console.warn("fetchTopScore failed:", e);
    }
  }, [hasContract, pacmanContract?.address, accounts]);

  const initFetch = useRef(false);
  useEffect(() => {
    if (ethersReadonlyProvider && !initFetch.current) {
      initFetch.current = true;
      fetchTopScore();
    }
  }, [ethersSigner, ethersReadonlyProvider]);

  // ─────────────────────────────────────────────
  // FHE decrypt
  // ─────────────────────────────────────────────
  const {
    decrypt,
    canDecrypt,
    isDecrypting,
    message: decryptMessage,
    results,
  } = useFHEDecrypt({
    instance,
    ethersSigner: ethersSigner as any,
    fhevmDecryptionSignatureStorage: decStore,
    chainId,
    requests: encryptedBest ? [encryptedBest] : undefined,
  });

  useEffect(() => {
    if (decryptMessage) setStatusMsg(decryptMessage);
  }, [decryptMessage]);

  const decryptScore = decrypt;

  // ─────────────────────────────────────────────
  // FHE encrypt
  // ─────────────────────────────────────────────
  const { encryptWith } = useFHEEncryption({
    instance,
    ethersSigner: ethersSigner as any,
    contractAddress: pacmanContract?.address,
  });

  const canSubmit = useMemo(() => {
    return Boolean(instance && hasContract && ethersSigner && !processing);
  }, [instance, hasContract, ethersSigner, processing]);

  const getEncMethod = (fnName: "recordScore") => {
    const abiItem = pacmanContract?.abi.find(i => i.type === "function" && i.name === fnName);

    if (!abiItem) return { method: undefined, error: `ABI function not found: ${fnName}` };
    if (!abiItem.inputs || !abiItem.inputs.length)
      return { method: undefined, error: `Function ${fnName} has no inputs` };

    return { method: getEncryptionMethod(abiItem.inputs[0]!.internalType), error: undefined };
  };

  // ─────────────────────────────────────────────
  // Submit encrypted Pac-Man score
  // ─────────────────────────────────────────────
  const submitScore = useCallback(
    async (score: number) => {
      if (processing || !canSubmit) return;

      setProcessing(true);
      setStatusMsg(`Encrypting Pac-Man score ${score}...`);

      try {
        const { method, error } = getEncMethod("recordScore");
        if (!method) return setStatusMsg(error ?? "Failed to parse ABI input");

        const encrypted = await encryptWith(builder => {
          (builder as any)[method](score);
        });

        if (!encrypted) return setStatusMsg("Encryption failed");

        const write = getContract("write");
        if (!write) return setStatusMsg("Signer unavailable");

        const params = buildParamsFromAbi(encrypted, [...pacmanContract!.abi] as any[], "recordScore");

        const tx = await write.recordScore(...params, { gasLimit: 350_000 });
        setStatusMsg("Waiting for blockchain confirmation...");
        await tx.wait();

        setStatusMsg(`Your Pac-Man score (${score}) is submitted!`);
        await fetchTopScore();
      } catch (e: any) {
        setStatusMsg(`recordScore() failed: ${e.message ?? e}`);
      } finally {
        setProcessing(false);
      }
    },
    [processing, canSubmit, encryptWith, pacmanContract?.abi, getContract, fetchTopScore],
  );

  useEffect(() => {
    setStatusMsg("");
  }, [accounts, chainId]);

  return {
    contractAddress: pacmanContract?.address,

    canDecrypt,
    decryptScore,
    encryptedBest,
    results,

    submitScore,
    fetchTopScore,

    isDecrypting,
    processing,
    canSubmit,

    chainId,
    accounts,
    isConnected,
    ethersSigner,

    statusMsg,
  };
};

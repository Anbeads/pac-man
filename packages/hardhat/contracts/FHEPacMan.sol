// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title FHEPacMan
 * @notice Secure encrypted high-score tracker for a Pac-Man style game.
 * Each user’s top encrypted score is kept private and only decryptable by them.
 */
contract FHEPacMan is SepoliaConfig {
    // Store encrypted top score for each address
    mapping(address => euint32) private _pacmanTopScore;
    mapping(address => bool) private _scoreExists;

    /**
     * @notice Record an encrypted Pac-Man score.
     * If it's not higher than existing score, the value is ignored.
     * @param scoreCipher Encrypted score submitted from the client
     * @param zkProof Verification proof for encrypted value
     */
    function recordScore(externalEuint32 scoreCipher, bytes calldata zkProof) external {
        // Convert external encrypted input to internal encrypted integer
        euint32 newScore = FHE.fromExternal(scoreCipher, zkProof);

        // Give permissions
        FHE.allow(newScore, msg.sender);
        FHE.allowThis(newScore);

        // Case: player already has a stored score
        if (_scoreExists[msg.sender]) {
            euint32 savedScore = _pacmanTopScore[msg.sender];

            // Select greater encrypted value
            euint32 updatedScore = FHE.max(newScore, savedScore);

            _pacmanTopScore[msg.sender] = updatedScore;

            // Re-allow visibility
            FHE.allow(updatedScore, msg.sender);
            FHE.allowThis(updatedScore);
        } else {
            // First time submission
            _pacmanTopScore[msg.sender] = newScore;
            _scoreExists[msg.sender] = true;

            FHE.allow(newScore, msg.sender);
            FHE.allowThis(newScore);
        }
    }

    /**
     * @notice Returns the encrypted highest Pac-Man score of a user.
     * @param user Address of the player
     */
    function viewTopScore(address user) external view returns (euint32) {
        require(_scoreExists[user], "No Pac-Man score found for this player");
        return _pacmanTopScore[user];
    }

    /**
     * @notice Check if a user ever submitted a score.
     * @param user Player address
     */
    function hasScore(address user) external view returns (bool) {
        return _scoreExists[user];
    }
}

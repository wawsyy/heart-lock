// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Encrypted peer review contract for anonymous performance evaluations
/// @author web1
/// @notice Handles encrypted score submissions, keeps an encrypted running total,
/// and exposes encrypted aggregates for authorized decryptors.
contract EncryptedPeerReview is SepoliaConfig {
    /// @notice Address with permission to retrieve the encrypted total score.
    address public immutable manager;

    /// @dev Encrypted running total of all submitted scores.
    euint32 private _encryptedTotal;

    /// @dev Encrypted average score, recomputed at every submission.
    euint32 private _encryptedAverage;

    /// @dev Number of unique participants that submitted a score.
    uint32 private _participantCount;

    /// @dev Tracks the encrypted score submitted by each participant.
    mapping(address => euint32) private _scores;

    /// @dev Marks whether a participant has already submitted a score.
    mapping(address => bool) private _hasSubmitted;

    /// @notice Emitted whenever a participant submits or updates their score.
    /// @param reviewer Address of the participant submitting the score.
    /// @param updated Indicates whether the submission overwrote a previous score.
    event ScoreSubmitted(address indexed reviewer, bool updated);

    /// @notice Sets the contract deployer as the manager and initialises totals.
    constructor() {
        manager = msg.sender;

        _encryptedTotal = FHE.asEuint32(0);
        _encryptedAverage = FHE.asEuint32(0);

        FHE.allowThis(_encryptedTotal);
        FHE.allowThis(_encryptedAverage);

        FHE.allow(_encryptedTotal, manager);
        FHE.allow(_encryptedAverage, manager);
    }

    /// @notice Submit or update an encrypted performance score.
    /// @param scoreHandle Handle pointing to the encrypted score.
    /// @param scoreProof Proof validating the encrypted score handle.
    function submitScore(externalEuint32 scoreHandle, bytes calldata scoreProof) external {
        euint32 score = FHE.fromExternal(scoreHandle, scoreProof);

        bool wasUpdate = _hasSubmitted[msg.sender];

        if (wasUpdate) {
            euint32 previousScore = _scores[msg.sender];
            _encryptedTotal = FHE.sub(_encryptedTotal, previousScore);
        } else {
            _hasSubmitted[msg.sender] = true;
            _participantCount += 1;
        }

        _scores[msg.sender] = score;
        _encryptedTotal = FHE.add(_encryptedTotal, score);

        if (_participantCount > 0) {
            _encryptedAverage = FHE.div(_encryptedTotal, _participantCount);
        }

        FHE.allowThis(_scores[msg.sender]);
        FHE.allow(_scores[msg.sender], msg.sender);

        FHE.allowThis(_encryptedTotal);
        FHE.allowThis(_encryptedAverage);

        FHE.allow(_encryptedTotal, manager);
        FHE.allow(_encryptedAverage, manager);
        FHE.allow(_encryptedAverage, msg.sender);

        emit ScoreSubmitted(msg.sender, wasUpdate);
    }

    /// @notice Reissues decryption rights for the caller's encrypted score.
    function requestMyScoreAccess() external {
        require(_hasSubmitted[msg.sender], "PeerReview: score not submitted");

        FHE.allow(_scores[msg.sender], msg.sender);
    }

    /// @notice Returns the caller's encrypted score.
    /// @return encryptedScore The encrypted score linked to the caller.
    function getMyScore() external view returns (euint32 encryptedScore) {
        require(_hasSubmitted[msg.sender], "PeerReview: score not submitted");

        return _scores[msg.sender];
    }

    /// @notice Ensures the caller can decrypt the encrypted average.
    function requestAverageAccess() external {
        require(_participantCount > 0, "PeerReview: no scores");
        require(msg.sender == manager || _hasSubmitted[msg.sender], "PeerReview: unauthorized");

        FHE.allow(_encryptedAverage, msg.sender);
    }

    /// @notice Ensures the manager can decrypt the encrypted total.
    function requestTotalAccess() external {
        require(msg.sender == manager, "PeerReview: only manager");

        FHE.allow(_encryptedTotal, msg.sender);
    }

    /// @notice Returns the encrypted total score. Only manager may read it.
    /// @return total The encrypted aggregate of all submitted scores.
    /// @return count The number of unique score submitters.
    function getEncryptedTotal() external view returns (euint32 total, uint32 count) {
        require(msg.sender == manager, "PeerReview: only manager");
        return (_encryptedTotal, _participantCount);
    }

    /// @notice Returns the encrypted average score calculated on-chain.
    /// @return average The encrypted average of all scores.
    /// @return count The number of unique score submitters.
    function getEncryptedAverage() external view returns (euint32 average, uint32 count) {
        require(_participantCount > 0, "PeerReview: no scores");
        require(msg.sender == manager || _hasSubmitted[msg.sender], "PeerReview: unauthorized");

        return (_encryptedAverage, _participantCount);
    }

    /// @notice Indicates whether an address has already submitted a score.
    /// @param reviewer The address to check.
    /// @return True if the reviewer has an active submission.
    function hasSubmitted(address reviewer) external view returns (bool) {
        return _hasSubmitted[reviewer];
    }

    /// @notice Returns the count of participants who have submitted scores.
    /// @return The number of unique reviewers.
    function participantCount() external view returns (uint32) {
        return _participantCount;
    }
}


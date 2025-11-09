# CipherScore – Encrypted Peer Review MVP

CipherScore is an FHE-enabled peer review workflow that lets teammates exchange anonymous performance scores. Contributors encrypt their ratings locally, the smart contract aggregates everything on-chain, and only authorised parties can decrypt insights.

## Quick links

- Live dApp: [heart-lock-git-master-waws-projects-2bccbfbd.vercel.app](https://heart-lock-git-master-waws-projects-2bccbfbd.vercel.app)
- Demo video (~10 MB): [web1.mp4](./web1.mp4)
- Core contract: [`contracts/EncryptedPeerReview.sol`](contracts/EncryptedPeerReview.sol)

## System overview

- **Client-side FHE encryption** – scores are turned into `euint32` ciphertexts before they ever leave the browser.
- **On-chain aggregation** – the contract keeps encrypted totals and averages, safely handling score resubmissions.
- **Self-service decryptions** – reviewers decrypt their own submissions and the global average with explicit access grants.
- **Manager audit trail** – authorised managers may still unlock the encrypted total via CLI tooling when required.
- **RainbowKit UX** – Rainbow, WalletConnect, and MetaMask connectors are bundled with custom CipherScore branding inspired by `@zama-9`.

### Architecture at a glance

```
web1/
├── contracts/EncryptedPeerReview.sol      # Core FHE smart contract
├── deploy/deploy.ts                       # Hardhat deploy script
├── tasks/EncryptedPeerReview.ts           # CLI utilities for encryption/decryption flows
├── test/                                  # Unit + Sepolia integration specs
├── frontend/                              # Next.js app (RainbowKit + wagmi)
└── deployments/                           # Generated deployment manifests (via hardhat-deploy)
```

### Deployment snapshot

| Network | Address | Notes |
| --- | --- | --- |
| Sepolia (`11155111`) | `0xB67a588e550673b1EfF8bCc0ed14c9A15F305c77` | Production preview used by the Vercel build |
| Hardhat (`31337`) | `0x5FbDB2315678afecb367f032d93F642f64180aa3` | Auto-generated when running the local node |

Refer to `frontend/abi/EncryptedPeerReviewAddresses.ts` for regenerated artefacts after each deploy.

## Encryption and decryption flow

1. **Submit** – a participant encrypts a 0–100 score locally and calls `submitScore`. The contract refreshes the encrypted total, recomputes the average, and re-issues permissions for both manager and author.
2. **Personal audit** – reviewers call `requestMyScoreAccess` + `getMyScore` and decrypt the ciphertext in-browser via the FHEVM SDK.
3. **Team insight** – participants (or the manager) call `requestAverageAccess` + `getEncryptedAverage`, then decrypt the encrypted average client-side.
4. **Manager oversight** – if required, the designated manager can call `requestTotalAccess` and decrypt `_encryptedTotal` from the CLI without exposing it in the UI.

```52:131:web1/contracts/EncryptedPeerReview.sol
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

    function requestAverageAccess() external {
        require(_participantCount > 0, "PeerReview: no scores");
        require(msg.sender == manager || _hasSubmitted[msg.sender], "PeerReview: unauthorized");

        FHE.allow(_encryptedAverage, msg.sender);
    }
```

## Prerequisites

- Node.js **20.x** or newer (tested on v22.x)
- npm **10.x**
- For Sepolia usage: mnemonic or private key, an RPC URL (Infura/Alchemy/etc.), and a WalletConnect Project ID

## 1. Install dependencies

From the Hardhat root:

```bash
cd web1
npm install
```

Then install frontend dependencies:

```bash
cd frontend
npm install
```

## 2. Local development flow

1. **Start the FHE-ready Hardhat node**
   ```bash
   cd web1
   npx hardhat node
   ```

2. **Deploy the contract to localhost (31337)**
   ```bash
   npx hardhat deploy --network localhost
   ```

3. **Generate frontend ABI + addresses**
   ```bash
   cd frontend
   npm run genabi
   ```

4. **Launch the dashboard in mock mode (auto checks the Hardhat node)**
   ```bash
   npm run dev:mock
   ```

5. **Connect with Rainbow**
   - The Connect Button sits top-right.
   - RainbowKit works with Hardhat accounts out of the box; ensure your browser wallet is pointed at `127.0.0.1:8545`.

## 3. Sepolia deployment

1. Configure secrets once:
   ```bash
   npx hardhat vars set MNEMONIC             # or use PRIVATE_KEY
   npx hardhat vars set INFURA_API_KEY       # or another RPC provider key
   npx hardhat vars set ETHERSCAN_API_KEY    # optional, for verification
   ```

2. Deploy and collect the address:
   ```bash
   npx hardhat deploy --network sepolia
   ```

3. Update the frontend ABI registry:
   ```bash
   cd frontend
   npm run genabi
   ```

4. Provide RainbowKit with credentials (create `.env.local` in `frontend/`):
   ```env
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_id
   NEXT_PUBLIC_SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/<api-key>
   ```

5. Start the UI with `npm run dev` and connect via Rainbow.

## 4. Hardhat scripts & tasks

- `npx hardhat test` – executes the mock-unit test suite.
- `npx hardhat test --network sepolia` – runs the integration spec (requires live deployment).
- `npx hardhat --network localhost peer:submit --value 72` – CLI score submission.
- `npx hardhat --network localhost peer:average` – decrypt the team average.
- `npx hardhat --network localhost peer:total` – manager-only aggregate total (not exposed in the UI).

## 5. Frontend usage cheatsheet

| Section | Action |
| --- | --- |
| Submit score | pick 0–100, click **Submit encrypted score** |
| My submission | **Decrypt my score** re-requests access + decrypts locally |
| Team average | available to participants & manager; button handles permission + decryption |

Status and FHE runtime diagnostics surface at the bottom of the dashboard.

## 6. Running tests

```bash
cd web1
npx hardhat test
```

Front-end unit tests are untouched from the template; run `npm run test` in `frontend/` if needed.

## 7. Linting

```bash
cd web1/frontend
npm run lint
```

## Additional references

- [Zama FHEVM Documentation](https://docs.zama.ai/protocol)
- [RainbowKit Docs](https://www.rainbowkit.com/docs/introduction)
- [wagmi Docs](https://wagmi.sh)

---

CipherScore demonstrates an end-to-end encrypted performance review loop – submissions, reviews, and decryption permissions now live entirely on-chain while keeping sensitive metrics private.

# CipherScore – Encrypted Peer Review MVP

CipherScore is an FHE-enabled peer review workflow that lets teams exchange anonymous performance scores. Contributors encrypt their ratings locally, the smart contract aggregates everything on-chain, and only authorised reviewers can decrypt aggregate insights.

The project combines an upgraded Hardhat stack (`contracts`, `tasks`, `test`) with a Next.js + RainbowKit dashboard in `frontend/`.

## Features

- **Encrypted submissions** – participants send `euint32` scores through the FHEVM precompiles.
- **On-chain analytics** – the contract maintains encrypted totals and averages, handling resubmissions securely.
- **Role-aware decryptions** – reviewers can decrypt their own scores and the team average; managers unlock the aggregate total.
- **Rainbow wallet UX** – RainbowKit powers wallet connection with sensible defaults for Hardhat and Sepolia.
- **Custom brand** – bespoke CipherScore iconography and layout inspired by the zama-9 design references.

## Project Layout

```
web1/
├── contracts/EncryptedPeerReview.sol      # Core FHE smart contract
├── deploy/deploy.ts                       # Hardhat deploy script
├── tasks/EncryptedPeerReview.ts           # CLI utilities for encryption/decryption flows
├── test/                                  # Unit + Sepolia integration specs
├── frontend/                              # Next.js app (RainbowKit + wagmi)
└── deployments/                           # Generated deployment manifests (via hardhat-deploy)
```

## Prerequisites

- Node.js **20.x** or newer (tested on v22.x)
- npm **10.x**
- For Sepolia usage: Mnemonic + RPC URL (Infura/Alchemy/etc.) and a WalletConnect Project ID

## 1. Install dependencies

From the Hardhat root:

```bash
cd web1
npm install
```

Then install frontend dependencies (generates `package-lock.json` for the UI workspace):

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

## 3. Sepolia deployment (optional)

1. Configure secrets once:
   ```bash
   npx hardhat vars set MNEMONIC
   npx hardhat vars set INFURA_API_KEY   # or another RPC provider key
   npx hardhat vars set ETHERSCAN_API_KEY   # optional, for verification
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
- `npx hardhat --network localhost peer:total` – manager-only aggregate total.

## 5. Frontend usage cheatsheet

| Section | Action |
| --- | --- |
| Submit score | pick 0–100, click **Submit encrypted score** |
| My submission | **Decrypt my score** re-requests access + decrypts locally |
| Team average | available to participants & manager; button handles permission + decryption |
| Management total | only the manager address sees the button enabled |

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

CipherScore demonstrates an end-to-end encrypted performance review loop – submissions, reviews, and decryption permissions now live entirely on-chain.

import { useSolana } from '@/components/solana/use-solana'
import { WalletDropdown } from '@/components/wallet-dropdown'
import { AppHero } from '@/components/app-hero'
import { OnchainVaultUiProgramExplorerLink } from './ui/onchain-vault-ui-program-explorer-link'
import { OnchainVaultUiCreate } from './ui/onchain-vault-ui-create'
import { OnchainVaultUiProgram } from '@/features/onchain-vault/ui/onchain-vault-ui-program'

export default function OnchainVaultFeature() {
  const { account } = useSolana()

  if (!account) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="hero py-[64px]">
          <div className="hero-content text-center">
            <WalletDropdown />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <AppHero title="OnchainVault" subtitle={'Run the program by clicking the "Run program" button.'}>
        <p className="mb-6">
          <OnchainVaultUiProgramExplorerLink />
        </p>
        <OnchainVaultUiCreate account={account} />
      </AppHero>
      <OnchainVaultUiProgram />
    </div>
  )
}

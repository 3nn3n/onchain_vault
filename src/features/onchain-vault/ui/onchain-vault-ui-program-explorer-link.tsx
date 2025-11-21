import { ONCHAIN_VAULT_PROGRAM_ADDRESS } from '@project/anchor'
import { AppExplorerLink } from '@/components/app-explorer-link'
import { ellipsify } from '@wallet-ui/react'

export function OnchainVaultUiProgramExplorerLink() {
  return <AppExplorerLink address={ONCHAIN_VAULT_PROGRAM_ADDRESS} label={ellipsify(ONCHAIN_VAULT_PROGRAM_ADDRESS)} />
}

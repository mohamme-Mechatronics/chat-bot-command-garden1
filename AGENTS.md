<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Application rules
- Share the Arabic administration shell across content routes; authorize all customer data through administrator-only RLS.
- Identify conversations by platform and customer ID to prevent cross-channel collisions.
- Keep n8n as the message delivery engine; verified public events feed Cloud storage and authenticated server functions send manual replies.
- Grant the first administrator only through a one-use enrollment code; never allow self-assigned roles.
- Keep native clients isolated under native/ and Electron under electron/; bundle the shared administration UI locally while delegating privileged operations to bearer-authenticated, administrator-checked HTTP handlers.
- Share administrative operation implementations between Start server functions and the portable HTTP handler to prevent divergent authorization or reply behavior.
- Android updates use manually requested, checksum-validated same-service ZIP bundles with Capacitor Updater; never redirect startup to the hosted UI, so installed screens remain local.
- Prepare native update assets with the native build and package-update script before publishing UI changes; website publication alone does not regenerate installed bundles.

- Reuse the supplied brand asset across web and locally bundled clients; derive compact launcher/favicon artwork from that same asset so identities stay consistent without changing bot identifiers.

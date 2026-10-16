# Agent workflow

1. Read `AGENTS.md`, then the relevant story, art, and architecture owners.
   Identify the observable result and whether proposed content is canon or an example.
2. For gameplay/story, write the motive-to-feedback causal chain and identify
   affected named characters. For tooling, identify the actual development need.
3. Make a bounded coherent slice through existing owners. Update semantic docs
   with behavior. Preserve save compatibility or reject/migrate intentionally.
4. Run focused tests and `npm run check`. Exercise changed integrated behavior
   in a browser where applicable; inspect actual scene, console, and narrow layout.
5. Hand off files/revision, what was verified and how, known limits, and next
   decision. Distinguish test/build from browser proof and deployment. Do not
   imply remote CI, production art, or a campaign exists when it does not.

Keep screenshots and temporary browser artifacts under ignored `output/` or
outside the repo. Keep secrets, workstation paths, personal context, and internal
coordination transcripts out of this public project. Do not choose a license,
publish, deploy, or add infrastructure without the relevant user authority.

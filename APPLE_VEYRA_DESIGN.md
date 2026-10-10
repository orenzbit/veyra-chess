# Veyra Chess — Apple-inspired web restyle

This restyle adapts the uploaded MIT-licensed `apple-design-system` skill to Veyra Chess without copying its implementation code.

## Applied rules
- Single interactive accent: Action Blue `#0066cc`.
- Primary actions use pill buttons.
- No decorative gradients or chrome shadows.
- Surface changes and hairlines create hierarchy.
- Typography uses a 400 / 600 / 700 weight ladder.
- Review keeps the chessboard as the product artifact on a dark tile while surrounding UI uses Apple-inspired white/parchment surfaces.
- Status colors remain limited to move classifications/status UI.

## Veyra-specific adaptation
- Dark chessboard framing is retained because the board is the core product surface.
- Existing Review / Coach / Bots / Adaptive / Admin interactions remain structurally intact.
- Existing `cm-chessboard`, engine, opening, auth and backend behavior is not replaced by the visual restyle.

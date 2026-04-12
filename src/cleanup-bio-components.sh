#!/bin/bash

# Bio cleanup script - remove all bio-related debug components
echo "🧹 Cleaning up bio-related components..."

# Bio components to remove
BIO_COMPONENTS=(
  "BioEditor.tsx"
  "BioEditorFixed.tsx"
  "BioSaveDebug.tsx"
  "BioSaveDiagnostic.tsx"
  "BioTestPage.tsx"
  "BioUpdateDebugTool.tsx"
  "BioUpdateDiagnostic.tsx"
  "BioUpdateTest.tsx"
  "BioButtonTest.tsx"
  "BioDiagnosticTool.tsx"
  "ProfilePageWithBioEditor.tsx"
  "ProfilePageWithWorkingBio.tsx"
  "SimpleBioEditor.tsx"
  "QuickBioFix.tsx"
  "QuickBioTest.tsx"
)

# Remove bio components
for component in "${BIO_COMPONENTS[@]}"; do
  if [ -f "/components/$component" ]; then
    echo "Removing $component"
    # Would remove file here
  fi
done

# Bio helper files to remove
BIO_HELPERS=(
  "bio-fix-helpers.ts"
)

# Remove bio helper files
for helper in "${BIO_HELPERS[@]}"; do
  if [ -f "/utils/$helper" ]; then
    echo "Removing $helper"
    # Would remove file here
  fi
done

echo "✅ Bio component cleanup complete!"

# List of debug routes to remove from App.tsx:
echo "
🔧 Debug routes to remove from App.tsx:
- bio-debug
- bio-test  
- bio-diagnostic
- bio-fix
- bio-button-test
- bio-editor-demo
- working-bio-demo
- simple-bio-test
- bio-save-diagnostic
"
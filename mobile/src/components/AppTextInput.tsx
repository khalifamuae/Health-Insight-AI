import React, { forwardRef } from 'react';
import { Platform, TextInput as RNTextInput, TextInputProps } from 'react-native';

const AppTextInput = forwardRef<RNTextInput, TextInputProps>(function AppTextInput(
  {
    autoComplete,
    textContentType,
    importantForAutofill,
    autoCorrect = false,
    spellCheck = false,
    passwordRules,
    secureTextEntry,
    contextMenuHidden,
    ...props
  },
  ref
) {
  const resolvedAutoComplete = autoComplete ?? 'off';
  const resolvedTextContentType =
    textContentType ?? (secureTextEntry && Platform.OS === 'ios' ? 'oneTimeCode' : 'none');
  const resolvedImportantForAutofill =
    importantForAutofill ?? (secureTextEntry ? 'noExcludeDescendants' : 'no');

  return (
    <RNTextInput
      ref={ref}
      autoComplete={resolvedAutoComplete}
      textContentType={resolvedTextContentType}
      importantForAutofill={resolvedImportantForAutofill}
      autoCorrect={autoCorrect}
      spellCheck={spellCheck}
      secureTextEntry={secureTextEntry}
      passwordRules={passwordRules ?? (secureTextEntry ? null : undefined)}
      contextMenuHidden={contextMenuHidden ?? secureTextEntry}
      disableFullscreenUI
      {...props}
    />
  );
});

export default AppTextInput;

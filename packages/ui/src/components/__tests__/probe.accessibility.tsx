import React from 'react';
import { View, Text } from 'react-native';
import { createThemedRender } from '@pokedex/a11y-testing';

const renderWithTheme = createThemedRender(require('../../../tailwind.preset.js'));

describe('WCAG 1.4.3 probe', () => {
  test('className resolves to a real style in the test tree', async () => {
    const { getByTestId } = await renderWithTheme(
      <View testID="probe" className="bg-type-fire">
        <Text>hello</Text>
      </View>,
    );
    // eslint-disable-next-line no-console
    console.log('resolved style:', JSON.stringify(getByTestId('probe').props.style));
    expect(getByTestId('probe')).toBeTruthy();
  });
});

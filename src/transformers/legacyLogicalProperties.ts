import type { CSSObject } from '..';
import type { Transformer } from './interface';

function splitValues(
  value: string | number,
): [values: (string | number)[], important: boolean] {
  if (typeof value === 'number') {
    return [[value], false];
  }

  const rawStyle = String(value).trim();
  const importantCells = rawStyle.match(/(.*)(!important)/);

  const splitStyle = (importantCells ? importantCells[1] : rawStyle)
    .trim()
    .split(/\s+/);

  // Combine styles split in brackets, like `calc(1px + 2px)`
  let temp: string[] = [];
  let brackets = 0;
  return [
    splitStyle.reduce<string[]>((list, item) => {
      if (item.includes('(')) {
        temp.push(item);
        brackets += item.split('(').length - 1;
      } else if (item.includes(')')) {
        temp.push(item);
        brackets -= item.split(')').length - 1;
        if (brackets === 0) {
          list.push(temp.join(' '));
          temp = [];
        }
      } else if (brackets > 0) {
        temp.push(item);
      } else {
        list.push(item);
      }
      return list;
    }, []),
    !!importantCells,
  ];
}

type MatchValue = string[] & {
  notSplit?: boolean;
};

function noSplit(list: MatchValue): MatchValue {
  list.notSplit = true;
  return list;
}

const keyMap: Record<string, MatchValue> = {
  // Inset
  inset: ['top', 'right', 'bottom', 'left'],
  insetBlock: ['top', 'bottom'],
  insetBlockStart: ['top'],
  insetBlockEnd: ['bottom'],
  insetInline: ['left', 'right'],
  insetInlineStart: ['left'],
  insetInlineEnd: ['right'],

  // Margin
  marginBlock: ['marginTop', 'marginBottom'],
  marginBlockStart: ['marginTop'],
  marginBlockEnd: ['marginBottom'],
  marginInline: ['marginLeft', 'marginRight'],
  marginInlineStart: ['marginLeft'],
  marginInlineEnd: ['marginRight'],

  // Padding
  paddingBlock: ['paddingTop', 'paddingBottom'],
  paddingBlockStart: ['paddingTop'],
  paddingBlockEnd: ['paddingBottom'],
  paddingInline: ['paddingLeft', 'paddingRight'],
  paddingInlineStart: ['paddingLeft'],
  paddingInlineEnd: ['paddingRight'],

  // Border
  borderBlock: noSplit(['borderTop', 'borderBottom']),
  borderBlockStart: noSplit(['borderTop']),
  borderBlockEnd: noSplit(['borderBottom']),
  borderInline: noSplit(['borderLeft', 'borderRight']),
  borderInlineStart: noSplit(['borderLeft']),
  borderInlineEnd: noSplit(['borderRight']),

  // Border width
  borderBlockWidth: ['borderTopWidth', 'borderBottomWidth'],
  borderBlockStartWidth: ['borderTopWidth'],
  borderBlockEndWidth: ['borderBottomWidth'],
  borderInlineWidth: ['borderLeftWidth', 'borderRightWidth'],
  borderInlineStartWidth: ['borderLeftWidth'],
  borderInlineEndWidth: ['borderRightWidth'],

  // Border style
  borderBlockStyle: ['borderTopStyle', 'borderBottomStyle'],
  borderBlockStartStyle: ['borderTopStyle'],
  borderBlockEndStyle: ['borderBottomStyle'],
  borderInlineStyle: ['borderLeftStyle', 'borderRightStyle'],
  borderInlineStartStyle: ['borderLeftStyle'],
  borderInlineEndStyle: ['borderRightStyle'],

  // Border color
  borderBlockColor: ['borderTopColor', 'borderBottomColor'],
  borderBlockStartColor: ['borderTopColor'],
  borderBlockEndColor: ['borderBottomColor'],
  borderInlineColor: ['borderLeftColor', 'borderRightColor'],
  borderInlineStartColor: ['borderLeftColor'],
  borderInlineEndColor: ['borderRightColor'],

  // Border radius
  borderStartStartRadius: ['borderTopLeftRadius'],
  borderStartEndRadius: ['borderTopRightRadius'],
  borderEndStartRadius: ['borderBottomLeftRadius'],
  borderEndEndRadius: ['borderBottomRightRadius'],
};

function wrapImportantAndSkipCheck(value: string | number, important: boolean) {
  let parsedValue = value;

  if (important) {
    parsedValue = `${parsedValue} !important`;
  }

  return { _skip_check_: true, value: parsedValue };
}

/**
 * Convert css logical properties to legacy properties.
 * Such as: `margin-block-start` to `margin-top`.
 * Transform list:
 * - inset
 * - margin
 * - padding
 * - border
 */
const transform: Transformer = {
  visit: (cssObj) => {
    const clone: CSSObject = {};

    Object.keys(cssObj).forEach((key) => {
      const value = cssObj[key];
      const matchValue = keyMap[key];

      if (
        matchValue &&
        (typeof value === 'number' || typeof value === 'string')
      ) {
        const [values, important] = splitValues(value);

        if (matchValue.length && matchValue.notSplit) {
          // not split means always give same value like border
          matchValue.forEach((matchKey) => {
            clone[matchKey] = wrapImportantAndSkipCheck(value, important);
          });
        } else if (matchValue.length === 1) {
          // Handle like `marginBlockStart` => `marginTop`
          clone[matchValue[0]] = wrapImportantAndSkipCheck(value, important);
        } else if (matchValue.length === 2) {
          // Handle like `marginBlock` => `marginTop` & `marginBottom`
          matchValue.forEach((matchKey, index) => {
            clone[matchKey] = wrapImportantAndSkipCheck(
              values[index] ?? values[0],
              important,
            );
          });
        } else if (matchValue.length === 4) {
          // Handle like `inset` => `top` & `right` & `bottom` & `left`
          matchValue.forEach((matchKey, index) => {
            clone[matchKey] = wrapImportantAndSkipCheck(
              values[index] ?? values[index - 2] ?? values[0],
              important,
            );
          });
        } else {
          clone[key] = value;
        }
      } else {
        clone[key] = value;
      }
    });

    return clone;
  },
};

export default transform;

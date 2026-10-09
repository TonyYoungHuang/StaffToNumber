/**
 * Adapted from Smoosic src/smo/xform/selections.ts
 * Commit: 1427042ef0d6b9d8684b140c8f2a489270e8cc9f
 * https://github.com/Smoosic/Smoosic/blob/1427042ef0d6b9d8684b140c8f2a489270e8cc9f/src/smo/xform/selections.ts
 * Copyright (c) 2021 Aaron David Newman. MIT; see LICENSE.md.
 * Only fromMeasure was removed to avoid importing Smoosic score objects.
 * These positional selectors are transient navigation indices, never persisted event IDs.
 */

export class SmoSelector {
  static get default(): SmoSelector {
    return {
      staff: 0,
      measure: 0,
      voice: 0,
      tick: -1,
      pitches: []
    };
  }
  staff: number = 0;
  measure: number = 0;
  voice: number = 0;
  tick: number = -1;
  pitches: number[] = [];

  static measureSelector(staff: number, measure: number): SmoSelector {
    return { staff, measure, voice: 0, tick: 0, pitches: [] };
  }
  // TODO:  tick in selector s/b tickIndex
  static sameNote(sel1: SmoSelector, sel2: SmoSelector): boolean {
    return (sel1.staff === sel2.staff && sel1.measure === sel2.measure && sel1.voice === sel2.voice
      && sel1.tick === sel2.tick);
  }
  static sameMeasure(sel1: SmoSelector, sel2: SmoSelector): boolean {
    return (sel1.staff === sel2.staff && sel1.measure === sel2.measure);
  }

  static sameStaff(sel1: SmoSelector, sel2: SmoSelector): boolean {
    return sel1.staff === sel2.staff;
  }
  /**
   * Return gt, not considering the voice (e.g. gt in time)
   * @param sel1 
   * @param sel2 
   */
  static gtInTime(sel1: SmoSelector, sel2: SmoSelector): boolean {
    return (sel1.measure > sel2.measure) ||
    (sel1.measure === sel2.measure && sel1.tick > sel2.tick);
  }

  
  /**
   * return true if sel1 > sel2
   */
  static gt(sel1: SmoSelector, sel2: SmoSelector): boolean {
    // Note: voice is not considered b/c it's more of a vertical component
    // Note further: sometimes we need to consider voice
    return (sel1.staff > sel2.staff) ||
      (sel1.staff === sel2.staff && sel1.measure > sel2.measure) ||
      (sel1.staff === sel2.staff && sel1.measure === sel2.measure && sel1.voice > sel2.voice) ||
      (sel1.staff === sel2.staff && sel1.measure === sel2.measure && sel1.voice === sel2.voice && sel1.tick > sel2.tick);
  }

  static eq(sel1: SmoSelector, sel2: SmoSelector): boolean {
    return (sel1.staff === sel2.staff && sel1.voice === sel2.voice && sel1.measure === sel2.measure && sel1.tick === sel2.tick);
  }
  static neq(sel1: SmoSelector, sel2: SmoSelector): boolean {
    return !(SmoSelector.eq(sel1, sel2));
  }

  /**
   * return true if sel1 < sel2
   */
  static lt(sel1: SmoSelector, sel2: SmoSelector): boolean {
    return SmoSelector.gt(sel2, sel1);
  }

  /**
   * return true if sel1 >= sel2
   */
  static gteq(sel1: SmoSelector, sel2: SmoSelector): boolean {
    return SmoSelector.gt(sel1, sel2) || SmoSelector.eq(sel1, sel2);
  }
  /**
   * return true if sel1 <= sel2
   */
  static lteq(sel1: SmoSelector, sel2: SmoSelector): boolean {
    return SmoSelector.lt(sel1, sel2) || SmoSelector.eq(sel1, sel2);
  }
  // Return 2 selectors in score order, rv[0] is first in time.
  static order(a: SmoSelector, b: SmoSelector): SmoSelector[] {
    if (SmoSelector.gtInTime(a, b)) {
      return [b, a];
    }
    return [a, b];
  }

  // ### getNoteKey
  // Get a key useful for a hash map of notes.
  static getNoteKey(selector: SmoSelector) {
    return '' + selector.staff + '-' + selector.measure + '-' + selector.voice + '-' + selector.tick;
  }

  static getMeasureKey(selector: SmoSelector) {
    return '' + selector.staff + '-' + selector.measure;
  }

  // return true if testSel is contained in the selStart to selEnd range.
  static contains(testSel: SmoSelector, selStart: SmoSelector, selEnd: SmoSelector) {
    const geStart =
      selStart.measure < testSel.measure ||
      (selStart.measure === testSel.measure && selStart.tick <= testSel.tick);
    const leEnd =
      selEnd.measure > testSel.measure ||
      (selEnd.measure === testSel.measure && testSel.tick <= selEnd.tick);

    return geStart && leEnd;
  }
  static overlaps(start1: SmoSelector, end1: SmoSelector, start2: SmoSelector, end2: SmoSelector) {
    if (SmoSelector.contains(start1, start2, end2)) {
      return true;
    }
    if (SmoSelector.contains(end1, start2, end2)) {
      return true;
    }
    if (SmoSelector.contains(start2, start1, end1)) {
      return true;
    }
    if (SmoSelector.contains(end2, start1, end1)) {
      return true;
    }
    return false;
  }

  // create a hashmap key for a single note, used to organize modifiers
  static selectorNoteKey(selector: SmoSelector) {
    return 'staff-' + selector.staff + '-measure-' + selector.measure + '-voice-' + selector.voice + '-tick-' + selector.tick;
  }
}

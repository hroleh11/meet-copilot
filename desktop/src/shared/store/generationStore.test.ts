import { beforeEach, describe, expect, it } from 'vitest';
import { useGenerationStore } from './generationStore';

describe('generationStore', () => {
  beforeEach(() => {
    useGenerationStore.setState({
      mode: null,
      withScreenshot: false,
      text: '',
      streaming: false,
      error: null,
    });
  });

  it('grows the answer one piece at a time', () => {
    const store = useGenerationStore.getState();

    store.begin('reply', false);
    store.append('Так, ');
    store.append('готовий.');

    expect(useGenerationStore.getState().text).toBe('Так, готовий.');
    expect(useGenerationStore.getState().streaming).toBe(true);
  });

  it('drops the previous answer when a new one starts', () => {
    const store = useGenerationStore.getState();

    store.begin('reply', false);
    store.append('стара');
    store.fail('щось пішло не так');

    useGenerationStore.getState().begin('alternative', false);

    expect(useGenerationStore.getState()).toMatchObject({
      mode: 'alternative',
      text: '',
      streaming: true,
      error: null,
    });
  });

  it('keeps the partial answer when the stream fails', () => {
    const store = useGenerationStore.getState();

    store.begin('reply', false);
    store.append('половина');
    store.fail('зв’язок обірвався');

    expect(useGenerationStore.getState()).toMatchObject({
      text: 'половина',
      streaming: false,
      error: 'зв’язок обірвався',
    });
  });

  it('remembers that the question came with a screenshot', () => {
    useGenerationStore.getState().begin('reply', true);

    expect(useGenerationStore.getState().withScreenshot).toBe(true);

    useGenerationStore.getState().begin('alternative', false);

    expect(useGenerationStore.getState().withScreenshot).toBe(false);
  });

  it('wipes the answer when it is asked to clear', () => {
    const store = useGenerationStore.getState();

    store.begin('reply', true);
    store.append('стара відповідь');
    store.finish();

    useGenerationStore.getState().clear();

    expect(useGenerationStore.getState()).toMatchObject({
      mode: null,
      withScreenshot: false,
      text: '',
      streaming: false,
      error: null,
    });
  });

  it('stops streaming when the answer is complete', () => {
    const store = useGenerationStore.getState();

    store.begin('reply', false);
    store.append('готово');
    store.finish();

    expect(useGenerationStore.getState().streaming).toBe(false);
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import { useGenerationStore } from './generationStore';

describe('generationStore', () => {
  beforeEach(() => {
    useGenerationStore.setState({
      mode: null,
      text: '',
      streaming: false,
      error: null,
    });
  });

  it('grows the answer one piece at a time', () => {
    const store = useGenerationStore.getState();

    store.begin('reply');
    store.append('Так, ');
    store.append('готовий.');

    expect(useGenerationStore.getState().text).toBe('Так, готовий.');
    expect(useGenerationStore.getState().streaming).toBe(true);
  });

  it('drops the previous answer when a new one starts', () => {
    const store = useGenerationStore.getState();

    store.begin('reply');
    store.append('стара');
    store.fail('щось пішло не так');

    useGenerationStore.getState().begin('alternative');

    expect(useGenerationStore.getState()).toMatchObject({
      mode: 'alternative',
      text: '',
      streaming: true,
      error: null,
    });
  });

  it('keeps the partial answer when the stream fails', () => {
    const store = useGenerationStore.getState();

    store.begin('reply');
    store.append('половина');
    store.fail('зв’язок обірвався');

    expect(useGenerationStore.getState()).toMatchObject({
      text: 'половина',
      streaming: false,
      error: 'зв’язок обірвався',
    });
  });

  it('stops streaming when the answer is complete', () => {
    const store = useGenerationStore.getState();

    store.begin('reply');
    store.append('готово');
    store.finish();

    expect(useGenerationStore.getState().streaming).toBe(false);
  });
});

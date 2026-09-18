use objc2::rc::Retained;

pub struct ThreadSafe<T: ?Sized>(Retained<T>);

// SAFETY: ScreenCaptureKit objects are documented as usable from any thread and
// deliver samples on a dispatch queue the caller picks; the generated bindings
// mark nothing Send only because the generator cannot see that guarantee.
unsafe impl<T: ?Sized> Send for ThreadSafe<T> {}

impl<T: ?Sized> ThreadSafe<T> {
    pub fn new(value: Retained<T>) -> Self {
        Self(value)
    }

    pub fn get(&self) -> &T {
        &self.0
    }
}

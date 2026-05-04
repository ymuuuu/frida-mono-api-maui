# frida-mono-api-maui

Standalone Mono API + MAUI / unified-BCL extension for Frida. Zero external dependencies beyond `frida-ex-nativefunction`.

Combines three things in one package:

1. **Full `frida-mono-api` port** — `MonoApi` (raw C API wrappers) + `MonoApiHelper` (convenience layer), inlined and fixed for Frida 17. The originals still call the dead `Memory.readUtf8String` static; this version uses `NativePointer.readUtf8String()`.
2. **Frida-17-native string helpers** — `ClassGetName`, `MethodGetName`, `FieldGetName` via the instance method.
3. **Managed-delegate introspection** — `DelegateGetMethod`, `DelegateGetMethodPtr`, `DelegateGetTarget`, `CompileMethod`. Walks a `MonoDelegate*`'s ARM64-LP64 layout (offsets `+0x10` `method_ptr`, `+0x20` `target`, `+0x28` `MonoMethod*`) so a JS caller can locate the JIT/AOT entry of any managed method wrapped in a `Func<...>` / `Action<...>`. Stable across `mono/mono` and `dotnet/runtime` forks per `mono/metadata/object-internals.h`.

Plus one MAUI-specific convenience:

4. **`GetCallbackField(validatorInstance)`** — lazily resolves `<Callback>k__BackingField` on `Xamarin.Android.Net.ServerCertificateCustomValidator` from the instance's runtime class, with a per-class cache. Avoids hardcoding the assembly name at attach time.

## Why standalone?

Originally a thin extension on top of `frida-mono-api`. Inlined everything so it can be consumed as a single dependency — no sibling `file:` paths, no transitive dep headaches.

## Install

Consumed as ESM source (no build step). Clone and `npm i`:

```bash
git clone https://github.com/ymuuuu/frida-mono-api-maui.git
cd frida-mono-api-maui
npm i
```

## Usage

```javascript
import { MonoApi, MonoApiHelper, MonoApiMauiHelper } from 'frida-mono-api-maui'

// Walk a Func<...> instance to its JIT/AOT entry point and hook the return value:
let method = MonoApiMauiHelper.DelegateGetMethod(funcInstance)
let entry  = MonoApiMauiHelper.CompileMethod(method)
Interceptor.attach(entry, {
    onLeave: (retval) => { retval.replace(ptr(1)) }
})
console.log(`hooked method name = ${MonoApiMauiHelper.MethodGetName(method)}`)
```

## Credits

- [@freehuntx](https://github.com/freehuntx) — original `frida-mono-api`.
- [GoSecure](https://github.com/GoSecure) — `extra` branch additions consumed by the Xamarin tooling.

## License

MIT — see `LICENSE`.

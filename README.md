# frida-mono-api-maui

A small extension layer on top of [`frida-mono-api`](https://github.com/ymuuuu/frida-mono-api/tree/frida-17) (the Frida 17 fork), adding two things needed for generic .NET MAUI / unified-BCL targets:

1. **Frida-17-native string helpers** — `ClassGetName`, `MethodGetName`, `FieldGetName`. The originals in `frida-mono-api`'s `MonoApiHelper` still call the dead `Memory.readUtf8String` static and explode at runtime. These replacements use the `NativePointer.readUtf8String()` instance method introduced in Frida 16+.
2. **Managed-delegate introspection** — `DelegateGetMethod`, `DelegateGetMethodPtr`, `DelegateGetTarget`, `CompileMethod`. Walks a `MonoDelegate*`'s ARM64-LP64 layout (offsets `+0x10` `method_ptr`, `+0x20` `target`, `+0x28` `MonoMethod*`) so a JS caller can locate the JIT entry of any managed method wrapped in a `Func<...>` / `Action<...>`. Stable across `mono/mono` and `dotnet/runtime` forks per `mono/metadata/object-internals.h`.

Plus one MAUI-specific convenience:

3. **`GetCallbackField(validatorInstance)`** — lazily resolves `<Callback>k__BackingField` on `Xamarin.Android.Net.ServerCertificateCustomValidator` from the instance's runtime class, with a per-class cache. Avoids hardcoding the assembly name at attach time.

## Why a separate package?

`frida-mono-api` (the [`ymuuuu/frida-mono-api@frida-17`](https://github.com/ymuuuu/frida-mono-api/tree/frida-17) fork) is paired with an open upstream PR ([GoSecure/frida-mono-api#1](https://github.com/GoSecure/frida-mono-api/pull/1)) and stays scoped to the minimal Frida 17 portability fix. MAUI-specific helpers don't belong in that PR. This sibling project houses them so the upstream PR stays focused.

## Install

Consumed as a transitive ESM source (no build step). Clone into the same parent directory as `frida-mono-api`:

```
parent/
├── frida-mono-api/
└── frida-mono-api-maui/
```

`frida-mono-api-maui/package.json` depends on `"frida-mono-api": "file:../frida-mono-api"`.

## Usage

```javascript
import { MonoApiHelper } from 'frida-mono-api'
import { MonoApiMauiHelper } from 'frida-mono-api-maui'

// Walk a Func<...> instance to its JIT entry point and hook the return value:
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
- This extension — [@ymuuuu](https://github.com/ymuuuu).

## License

MIT — see `LICENSE`.

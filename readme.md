# [Ecosyste.ms: Digest](https://digest.ecosyste.ms)

An open API service providing digests of packages from many open source software ecosystems and registries. 

This project is part of [Ecosyste.ms](https://ecosyste.ms): Tools and open datasets to support, sustain, and secure critical digital infrastructure.

## API

Digest example: https://digest.ecosyste.ms/digest?algorithm=sha512&url=https://registry.npmjs.org/playwright/-/playwright-1.19.0-beta-1644595974000.tgz

```json
{
  "algorithm": "sha512",
  "digest": "sVfNtsoIlzURL8ALf4VbP0PF93oo3XRh+snIRQmmIqBIsFIEPT/Nc++rLU98uIlW7FAuENzioqMz94V703+lqw==",
  "url": "https://registry.npmjs.org/playwright/-/playwright-1.19.0-beta-1644595974000.tgz",
  "bytes": "7772",
  "sri": "sha512-sVfNtsoIlzURL8ALf4VbP0PF93oo3XRh+snIRQmmIqBIsFIEPT/Nc++rLU98uIlW7FAuENzioqMz94V703+lqw=="
}
```

List available algorithms: https://digest.ecosyste.ms/algorithms

```json
[
  "RSA-MD4",
  "RSA-MD5",
  "RSA-MDC2",
  "RSA-RIPEMD160",
  "RSA-SHA1",
  "RSA-SHA1-2",
  ...
  "ssl3-md5",
  "ssl3-sha1",
  "whirlpool"
]
```

<!-- Documentation for the REST API is available here: [https://digest.ecosyste.ms/docs](https://digest.ecosyste.ms/docs)

The default rate limit for the API is 5000/req per hour based on your IP address, get in contact if you need to to increase your rate limit. -->

## Development

For development and deployment documentation, check out [DEVELOPMENT.md](DEVELOPMENT.md)

## Contribute

Please do! The source code is hosted at [GitHub](https://github.com/ecosyste-ms/digest). If you want something, [open an issue](https://github.com/ecosyste-ms/digest/issues/new) or a pull request.

If you need want to contribute but don't know where to start, take a look at the issues tagged as ["Help Wanted"](https://github.com/ecosyste-ms/digest/issues?q=is%3Aopen+is%3Aissue+label%3A%22help+wanted%22).

You can also help triage issues. This can include reproducing bug reports, or asking for vital information such as version numbers or reproduction instructions. 

Finally, this is an open source project. If you would like to become a maintainer, we will consider adding you if you contribute frequently to the project. Feel free to ask.

For other updates, follow the project on Twitter: [@ecosyste_ms](https://twitter.com/ecosyste_ms).

### Note on Patches/Pull Requests

 * Fork the project.
 * Make your feature addition or bug fix.
 * Add tests for it. This is important so we don't break it in a future version unintentionally.
 * Send a pull request. Bonus points for topic branches.

### Vulnerability disclosure

We support and encourage security research on Ecosyste.ms under the terms of our [vulnerability disclosure policy](https://github.com/ecosyste-ms/digest/security/policy).

### Code of Conduct

Please note that this project is released with a [Contributor Code of Conduct](docs/CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## Copyright

[GNU Affero License](LICENSE) © 2022 [Andrew Nesbitt](https://github.com/andrew).

import { ImageName } from "./image-name";

describe.sequential("ContainerImage", () => {
  it("should return whether two image names are equal", () => {
    const imageName = new ImageName("registry", "image", "tag");

    expect(imageName.equals(new ImageName("registry", "image", "tag"))).toBe(true);
    expect(imageName.equals(new ImageName("registry", "image", "anotherTag"))).toBe(false);
    expect(imageName.equals(new ImageName("registry", "anotherImage", "tag"))).toBe(false);
    expect(imageName.equals(new ImageName("anotherRegistry", "image", "tag"))).toBe(false);
  });

  describe.sequential("string", () => {
    it("should work with registry", () => {
      const imageName = new ImageName("registry", "image", "tag");
      expect(imageName.string).toBe("registry/image:tag");
    });

    it("should work without registry", () => {
      const imageName = new ImageName(undefined, "image", "tag");
      expect(imageName.string).toBe("image:tag");
    });

    it("should work with tag being a hash", () => {
      const imageName = new ImageName(undefined, "image", "sha256:1234abcd1234abcd1234abcd1234abcd");
      expect(imageName.string).toBe("image@sha256:1234abcd1234abcd1234abcd1234abcd");
    });

    it("should work with registry and tag being a hash", () => {
      const imageName = new ImageName("registry", "image", "sha256:1234abcd1234abcd1234abcd1234abcd");
      expect(imageName.string).toBe("registry/image@sha256:1234abcd1234abcd1234abcd1234abcd");
    });

    it("should not append the `latest` tag to image IDs", () => {
      const imageName = new ImageName(
        undefined,
        "aa285b773a2c042056883845aea893a743d358a5d40f61734fa228fde93dae6f",
        "latest"
      );
      expect(imageName.string).toBe("aa285b773a2c042056883845aea893a743d358a5d40f61734fa228fde93dae6f");
    });

    it("should keep other tags (not `latest`) on image IDs", () => {
      // Note that the resulting image ID will not be accepted by Docker:
      //
      // > "invalid repository name [...], cannot specify 64-byte hexadecimal strings"
      //
      // However, not treating tags other than `latests` specially is probably less surprising.
      const imageName = new ImageName(
        undefined,
        "aa285b773a2c042056883845aea893a743d358a5d40f61734fa228fde93dae6f",
        "1"
      );
      expect(imageName.string).toBe("aa285b773a2c042056883845aea893a743d358a5d40f61734fa228fde93dae6f:1");
    });

    it.each(["custom.com/registry", "custom.com/registry/"])(
      "should substitute no registry with the one provided via TESTCONTAINERS_HUB_IMAGE_NAME_PREFIX when provided registry is %s",
      (customRegistry: string) => {
        vi.stubEnv("TESTCONTAINERS_HUB_IMAGE_NAME_PREFIX", customRegistry);
        const imageName = new ImageName(undefined, "image", "tag");
        expect(imageName.registry).toBe("custom.com");
        expect(imageName.image).toBe("registry/image");
        expect(imageName.tag).toBe("tag");
        expect(imageName.string).toBe("custom.com/registry/image:tag");
      }
    );
  });

  describe.sequential("fromString", () => {
    it("should work", () => {
      const imageName = ImageName.fromString("image:latest");

      expect(imageName.registry).toBeUndefined();
      expect(imageName.image).toBe("image");
      expect(imageName.tag).toBe("latest");
    });

    it("should work without tag", () => {
      const imageName = ImageName.fromString("image");

      expect(imageName.registry).toBeUndefined();
      expect(imageName.image).toBe("image");
      expect(imageName.tag).toBe("latest");
    });

    it("should work with registry", () => {
      const imageName = ImageName.fromString("domain.com/image:latest");

      expect(imageName.registry).toBe("domain.com");
      expect(imageName.image).toBe("image");
      expect(imageName.tag).toBe("latest");
    });

    it("should work with registry with port", () => {
      const imageName = ImageName.fromString("domain.com:5000/image:latest");

      expect(imageName.registry).toBe("domain.com:5000");
      expect(imageName.image).toBe("image");
      expect(imageName.tag).toBe("latest");
    });

    it("should work with registry without tag", () => {
      const imageName = ImageName.fromString("domain.com/image");

      expect(imageName.registry).toBe("domain.com");
      expect(imageName.image).toBe("image");
      expect(imageName.tag).toBe("latest");
    });

    it("should work with nested image", () => {
      const imageName = ImageName.fromString("parent/child:latest");

      expect(imageName.registry).toBe(undefined);
      expect(imageName.image).toBe("parent/child");
      expect(imageName.tag).toBe("latest");
    });

    it("should work with registry and nested image", () => {
      const imageName = ImageName.fromString("domain.com/parent/child:latest");

      expect(imageName.registry).toBe("domain.com");
      expect(imageName.image).toBe("parent/child");
      expect(imageName.tag).toBe("latest");
    });

    it("should work with tag being a hash", () => {
      const imageName = ImageName.fromString("image@sha256:1234abcd1234abcd1234abcd1234abcd");

      expect(imageName.registry).toBe(undefined);
      expect(imageName.image).toBe("image");
      expect(imageName.tag).toBe("sha256:1234abcd1234abcd1234abcd1234abcd");
    });

    it("should work with image being an image ID", () => {
      const imageName = ImageName.fromString("aa285b773a2c042056883845aea893a743d358a5d40f61734fa228fde93dae6f");

      expect(imageName.registry).toBe(undefined);
      expect(imageName.image).toBe("aa285b773a2c042056883845aea893a743d358a5d40f61734fa228fde93dae6f");
      expect(imageName.tag).toBe("latest");
    });

    it("should work with image being an image ID and an explicit tag", () => {
      // Note: Such an ID will not be accepted by docker:
      //
      // > "invalid repository name [...], cannot specify 64-byte hexadecimal strings"
      //
      // However, parsing it this way is probably least surprising.
      const imageName = ImageName.fromString("aa285b773a2c042056883845aea893a743d358a5d40f61734fa228fde93dae6f:1");

      expect(imageName.registry).toBe(undefined);
      expect(imageName.image).toBe("aa285b773a2c042056883845aea893a743d358a5d40f61734fa228fde93dae6f");
      expect(imageName.tag).toBe("1");
    });
  });

  describe.sequential.each([
    { customRegistry: "custom.com/registry", expectedRegistry: "custom.com", expectedImagePrefix: "registry/" },
    { customRegistry: "custom.com/registry/", expectedRegistry: "custom.com", expectedImagePrefix: "registry/" },
    { customRegistry: "custom.com", expectedRegistry: "custom.com", expectedImagePrefix: "" },
    { customRegistry: "custom.com/", expectedRegistry: "custom.com", expectedImagePrefix: "" },
    {
      customRegistry: "custom.com/registry/with/slashes",
      expectedRegistry: "custom.com",
      expectedImagePrefix: "registry/with/slashes/",
    },
  ])(
    "fromString with TESTCONTAINERS_HUB_IMAGE_NAME_PREFIX set to $customRegistry",
    ({ customRegistry, expectedRegistry, expectedImagePrefix }) => {
      beforeEach(() => {
        vi.stubEnv("TESTCONTAINERS_HUB_IMAGE_NAME_PREFIX", customRegistry);
      });

      it("should work", () => {
        const imageName = ImageName.fromString("image:latest");

        expect(imageName.registry).toEqual(expectedRegistry);
        expect(imageName.image).toEqual(`${expectedImagePrefix}image`);
        expect(imageName.tag).toBe("latest");
      });

      it("should work without tag", () => {
        const imageName = ImageName.fromString("image");

        expect(imageName.registry).toEqual(expectedRegistry);
        expect(imageName.image).toEqual(`${expectedImagePrefix}image`);
        expect(imageName.tag).toBe("latest");
      });

      it("should work with registry", () => {
        const imageName = ImageName.fromString("domain.com/image:latest");

        expect(imageName.registry).toBe("domain.com");
        expect(imageName.image).toBe("image");
        expect(imageName.tag).toBe("latest");
      });

      it("should work with registry with port", () => {
        const imageName = ImageName.fromString("domain.com:5000/image:latest");

        expect(imageName.registry).toBe("domain.com:5000");
        expect(imageName.image).toBe("image");
        expect(imageName.tag).toBe("latest");
      });

      it("should work with registry without tag", () => {
        const imageName = ImageName.fromString("domain.com/image");

        expect(imageName.registry).toBe("domain.com");
        expect(imageName.image).toBe("image");
        expect(imageName.tag).toBe("latest");
      });

      it("should work with nested image", () => {
        const imageName = ImageName.fromString("parent/child:latest");

        expect(imageName.registry).toEqual(expectedRegistry);
        expect(imageName.image).toEqual(`${expectedImagePrefix}parent/child`);
        expect(imageName.tag).toBe("latest");
      });

      it("should work with registry and nested image", () => {
        const imageName = ImageName.fromString("domain.com/parent/child:latest");

        expect(imageName.registry).toBe("domain.com");
        expect(imageName.image).toBe("parent/child");
        expect(imageName.tag).toBe("latest");
      });

      it("should work with tag being a hash", () => {
        const imageName = ImageName.fromString("image@sha256:1234abcd1234abcd1234abcd1234abcd");

        expect(imageName.registry).toEqual(expectedRegistry);
        expect(imageName.image).toEqual(`${expectedImagePrefix}image`);
        expect(imageName.tag).toBe("sha256:1234abcd1234abcd1234abcd1234abcd");
      });

      it("should work with image being an image ID", () => {
        const imageName = ImageName.fromString("aa285b773a2c042056883845aea893a743d358a5d40f61734fa228fde93dae6f");

        expect(imageName.registry).toEqual(expectedRegistry);
        expect(imageName.image).toEqual(
          `${expectedImagePrefix}aa285b773a2c042056883845aea893a743d358a5d40f61734fa228fde93dae6f`
        );
        expect(imageName.tag).toBe("latest");
      });

      it("should work with image being an image ID and an explicit tag", () => {
        // Note: Such an ID will not be accepted by docker:
        //
        // > "invalid repository name [...], cannot specify 64-byte hexadecimal strings"
        //
        // However, parsing it this way is probably least surprising.
        const imageName = ImageName.fromString("aa285b773a2c042056883845aea893a743d358a5d40f61734fa228fde93dae6f:1");

        expect(imageName.registry).toEqual(expectedRegistry);
        expect(imageName.image).toEqual(
          `${expectedImagePrefix}aa285b773a2c042056883845aea893a743d358a5d40f61734fa228fde93dae6f`
        );
        expect(imageName.tag).toBe("1");
      });

      // Add more tests here for different scenarios with prefix
    }
  );
});

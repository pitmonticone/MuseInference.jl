
## interface to be implemented by specific problem types

abstract type AbstractMuseProblem end



struct Transformedθ end
struct UnTransformedθ end
is_transformed(::Transformedθ) = true
is_transformed(::UnTransformedθ) = false


@doc doc"""
    transform_θ(prob::AbstractMuseProblem, θ) 

If needed, custom `AbstractMuseProblem`s should implement this to map
`θ` to a space where its domain is $(-\infty,\infty)$.
"""
transform_θ(prob::AbstractMuseProblem, θ) = θ

@doc doc"""
    inv_transform_θ(prob::AbstractMuseProblem, θ) 

If needed, custom `AbstractMuseProblem`s should implement this to map
`θ` from the space where its domain is $(-\infty,\infty)$
back to the original space.
"""
inv_transform_θ(prob::AbstractMuseProblem, θ) = θ


@doc doc"""
Custom `AbstractMuseProblem`s should implement this and return the
gradient of the joint log likelihood with respect to hyper parameters
`θ`, evaluated at data `x` and latent space `z`. The signature of the
function should be:

    ∇θ_logLike(prob::AbstractMuseProblem, x, z, θ)

If the problem needs a transformation of `θ` to map its domain to
$(-\infty,\infty)$, then it should instead implement:

    ∇θ_logLike(prob::AbstractMuseProblem, x, z, θ, θ_space)

where `θ_space` will be either `Transformedθ()` or `UnTransformedθ()`.
In this case, the `θ` argument will be passed in the space given by
`θ_space` and the gradient should be w.r.t. to `θ` in that space.

`z` must have domain $(-\infty,\infty)$. If a transformation is
required to make this the case, that should be handled internal to
this function and `z` will always refer to the transformed `z`.
"""
function ∇θ_logLike end
∇θ_logLike(prob::AbstractMuseProblem, x, z, θ, θ_space) = 
    ∇θ_logLike(prob::AbstractMuseProblem, x, z, θ)



@doc doc"""
Custom `AbstractMuseProblem`s should implement this and return a tuple
`(logLike, ∇z_logLike)` which give the log likelihood and its gradient
with respect to the latent space `z`, evaluated at hyper parameters
`θ` and data `x` . The signature of the function should be:

    logLike_and_∇z_logLike(prob::AbstractMuseProblem, x, z, θ)

`z` must have domain $(-\infty,\infty)$. If a transformation is
required to make this the case, that should be handled internal to
this function and `z` will always refer to the transformed `z`.

The `θ` argument to this function will always be in the un-transfored
`θ` space.

!!! note
    
    Alternatively, custom problems can implement `ẑ_at_θ` directly and
    forego this method. The default `ẑ_at_θ` runs LBFGS with Optim.jl
    using `logLike_and_∇z_logLike`.
"""
function logLike_and_∇z_logLike end



@doc doc"""
Custom `AbstractMuseProblem`s should implement this and return a tuple
`(x,z)` with data `x` and latent space `z` which are a sample from the
joint likelihood, given `θ`. The signature of the function should be:

    sample_x_z(prob::AbstractMuseProblem, rng::AbstractRNG, θ)

Random numbers generated internally should use `rng`.

The `θ` argument to this function will always be in the un-transfored
`θ` space.
"""
function sample_x_z end



@doc doc"""
Custom `AbstractMuseProblem`s with a non-zero log-prior should
implement this and return the log-prior at `θ`. The signature of the
function should be:

    logPriorθ(prob::AbstractMuseProblem, θ)

If the problem needs a transformation of `θ` to map its domain to
$(-\infty,\infty)$, then it should instead implement:

    logPriorθ(prob::AbstractMuseProblem, θ, θ_space)

where `θ_space` will be either `Transformedθ()` or `UnTransformedθ()`.
In this case, the `θ` argument will be passed in the space given by
`θ_space`. 
"""
logPriorθ(prob::AbstractMuseProblem, θ, θ_space) = logPriorθ(prob, θ)
logPriorθ(prob::AbstractMuseProblem, θ) = 0


@doc doc"""
Custom `AbstractMuseProblem`s can choose to implement this to turn a
user-provided `θ` into the data-structure used internally in the
computation. E.g. allow the user to pass a `NamedTuple` to functions
like `muse` or `get_J!` while internally converting it to a
`ComponentVector`. The signature of the function should be:

    standardizeθ(prob::AbstractMuseProblem, θ)

"""
standardizeθ(prob::AbstractMuseProblem, θ) = θ


@doc doc"""
Custom `AbstractMuseProblem`s can choose to implement this instead of
[`logLike_and_∇z_logLike`](@ref) to return the best-fit latent space
`z` given data `x` and parameters `θ`. The signature of the function
should be: 

    ẑ_at_θ(prob::AbstractMuseProblem, x, z₀, θ; ∇z_logLike_atol)

The return value should be `(ẑ, info)` where `info` can be any extra
diagonstic info which will be saved in the MUSE result. 

The `θ` argument to this function will always be in the un-transfored
`θ` space.

The `z₀` should be used as a starting guess for the solution. 
        
`z` must have domain $(-\infty,\infty)$. If a transformation is
required to make this the case, that should be handled internal to
this function, and the return value should refer to the transformed
`z`. 

The default implementation of this method uses
[`logLike_and_∇z_logLike`](@ref) and Optim.jl's LBFGS to iteratively
maximize the log likelihood. 
"""
function ẑ_at_θ(prob::AbstractMuseProblem, x, z₀, θ; ∇z_logLike_atol)
    soln = optimize(Optim.only_fg(z -> .-logLike_and_∇z_logLike(prob, x, z, θ)), z₀, Optim.LBFGS(), Optim.Options(g_tol=∇z_logLike_atol))
    _check_optim_soln(soln)
    soln.minimizer, soln
end

function _check_optim_soln(soln)
    Optim.converged(soln) || warn("MAP solution failed, result could be erroneous. Try tweaking `θ₀` or `∇z_logLike_atol` arguments to `muse` or fixing model.")
    isfinite(soln.minimum) || error("MAP solution failed with logjoint(MAP)=$(soln.minimum).")
end



@doc doc"""
    check_self_consistency(
        prob, 
        θ;
        fdm = central_fdm(3, 1),
        atol = 1e-3,
        rng = Random.default_rng()
    )

Checks the self-consistency of a defined problem at a given `θ`, e.g.
that `inv_transform_θ(prob, transform_θ(prob, θ)) ≈ θ`, etc... Mostly
useful as a diagonostic when implementing a new `AbstractMuseProblem`. 

A random `x` and `z` are sampled from `rng`. Finite differences are
computed using `fdm` and `atol` set the tolerance for `≈`. 
"""
function check_self_consistency(
    prob, 
    θ;
    fdm = central_fdm(3, 1),
    atol = 1e-3,
    rng = Random.default_rng()
)

    θ = standardizeθ(prob, θ)
    x, z = sample_x_z(prob, rng, θ)
    # volume factor which is added by transformations. dont assume the
    # transformation is AD-able (eg it isnt for Turing)
    J(θ) = FiniteDifferences.jacobian(fdm, θ -> transform_θ(prob, θ), θ)[1]
    V(θ) = logdet(J(θ))
    ∇θ_V(θ) = FiniteDifferences.grad(fdm, V, θ)[1]
    @testset "Self-consistency" begin
        @test inv_transform_θ(prob, transform_θ(prob, θ)) ≈ θ  atol=atol
        @test logPriorθ(prob, θ, UnTransformedθ()) ≈ logPriorθ(prob, transform_θ(prob, θ), Transformedθ()) + V(θ)  atol=atol
        @test ∇θ_logLike(prob, x, z, θ, UnTransformedθ()) ≈ J(θ)' * ∇θ_logLike(prob, x, z, transform_θ(prob, θ), Transformedθ()) + ∇θ_V(θ)  atol=atol
    end
end

